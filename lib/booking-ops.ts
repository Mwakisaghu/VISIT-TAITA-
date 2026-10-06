// Experience bookings: the database operations. Every function takes a transaction client (`db`), so a caller can make a whole
// change — seats, booking, payment, refund — succeed or fail together. Emails are NOT sent here: callers send them after commit.
import type { Prisma } from "@prisma/client";
import {
  ACTIVE_STATUSES, allocateRefund, cancellationQuote, holdExpiry, isActive, payAfterAcceptExpiry, planPayments, pricePerBooking, requestExpiry,
  validateBookingRequest, type CancelBy, type PaymentModeKey,
} from "@/lib/booking";
import { generateReference } from "@/lib/booking-reference";

export type Db = Prisma.TransactionClient;

/** How many unpaid / unanswered bookings one person may hold at once (stops someone reserving every seat and never paying). */
export const MAX_OPEN_HOLDS_PER_USER = 3;

// ---------------------------------------------------------------------------------------------------------------------------
// Seats. The counter is only ever changed by these two functions.
// ---------------------------------------------------------------------------------------------------------------------------

/**
 * Takes `seats` seats if there are enough. This is a compare-and-swap: it reads the count, then updates only if nobody else changed
 * the count in the meantime, and tries again if they did — so two people going for the last seat can never both get it.
 */
export async function holdSeats(db: Db, sessionId: string, seats: number): Promise<boolean> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const s = await db.experienceSession.findUnique({ where: { id: sessionId }, select: { status: true, capacity: true, seatsTaken: true } });
    if (!s || s.status !== "OPEN" || s.capacity - s.seatsTaken < seats) return false;
    const r = await db.experienceSession.updateMany({ where: { id: sessionId, status: "OPEN", seatsTaken: s.seatsTaken }, data: { seatsTaken: s.seatsTaken + seats } });
    if (r.count === 1) return true;
  }
  return false;
}

/** Gives seats back. Never takes the counter below zero. */
export async function releaseSeats(db: Db, sessionId: string, seats: number): Promise<void> {
  await db.experienceSession.updateMany({ where: { id: sessionId, seatsTaken: { gte: seats } }, data: { seatsTaken: { decrement: seats } } });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Making a booking
// ---------------------------------------------------------------------------------------------------------------------------
export type NewBookingInput = { experienceId: string; sessionId: string; userId: string; guestName: string; guestEmail: string; guestPhone: string; guests: unknown; note?: string | null; now: Date };

export async function createBooking(db: Db, input: NewBookingInput): Promise<{ ok: true; booking: { id: string; reference: string; status: string; collapsedToFull: boolean } } | { ok: false; error: string }> {
  const fail = (error: string) => ({ ok: false as const, error });
  const experience = await db.experience.findUnique({ where: { id: input.experienceId } });
  const session = await db.experienceSession.findUnique({ where: { id: input.sessionId } });
  if (!experience || !session || session.experienceId !== experience.id) return fail("That date is no longer available.");

  const v = validateBookingRequest({ experience: { ...experience, paymentMode: experience.paymentMode as PaymentModeKey }, session, guests: input.guests, now: input.now });
  if (!v.ok) return fail(v.error);

  const open = await db.booking.findMany({ where: { userId: input.userId, status: { in: ["REQUESTED", "AWAITING_PAYMENT"] } }, select: { sessionId: true } });
  if (open.some((b) => b.sessionId === session.id)) return fail("You already have an unfinished booking for that date. Finish or cancel it first.");
  if (open.length >= MAX_OPEN_HOLDS_PER_USER) return fail(`You have ${open.length} unfinished bookings. Please pay for or cancel one before making another.`);

  if (!(await holdSeats(db, session.id, v.guests))) return fail("Sorry — those seats have just been taken. Please choose another date or fewer guests.");

  const unitPrice = experience.priceFrom as number;
  const totalAmount = pricePerBooking(unitPrice, v.guests);
  const plan = planPayments({ mode: experience.paymentMode as PaymentModeKey, totalAmount, depositPercent: experience.depositPercent, balanceDueDays: experience.balanceDueDays, startsAt: session.startsAt, now: input.now });
  const status = plan.mode === "AFTER_CONFIRMATION" ? "REQUESTED" : "AWAITING_PAYMENT";
  const expiresAt = status === "REQUESTED" ? requestExpiry(input.now, session.startsAt) : holdExpiry(input.now);

  // The reference is random; on the (very unlikely) clash, try another.
  for (let i = 0; i < 4; i++) {
    const reference = generateReference();
    if (await db.booking.findUnique({ where: { reference }, select: { id: true } })) continue;
    const booking = await db.booking.create({
      data: {
        reference, experienceId: experience.id, sessionId: session.id, userId: input.userId,
        guestName: input.guestName, guestEmail: input.guestEmail, guestPhone: input.guestPhone, guests: v.guests, note: input.note ?? null,
        unitPrice, totalAmount, paymentMode: plan.mode, depositAmount: plan.depositAmount, balanceDueAt: plan.balanceDueAt,
        cancellationPolicy: experience.cancellationPolicy, status, expiresAt, termsAcceptedAt: input.now,
        createdAt: input.now, // the moment it was BOOKED (the cooling-off period is measured from here), not the database's clock
      },
      select: { id: true, reference: true, status: true },
    });
    return { ok: true, booking: { ...booking, collapsedToFull: plan.collapsedToFull } };
  }
  return fail("Couldn't create the booking — please try again.");
}

// ---------------------------------------------------------------------------------------------------------------------------
// Ending a booking (cancelled, declined, expired…), with the refund it owes
// ---------------------------------------------------------------------------------------------------------------------------
export type EndOpts = { by: CancelBy; reason: string; now: Date; fullRefund?: boolean; keepEverything?: boolean; finalStatus?: "CANCELLED" | "DECLINED" | "EXPIRED" | "NO_SHOW" };
export type EndResult = { ok: true; bookingId: string; quote: ReturnType<typeof cancellationQuote>; refunds: { id: string; amount: number; paymentId: string }[] } | { ok: false; error: string };

export async function endBooking(db: Db, bookingId: string, o: EndOpts): Promise<EndResult> {
  const b = await db.booking.findUnique({
    where: { id: bookingId },
    include: { session: { select: { startsAt: true } }, payments: { where: { status: "PAID" }, orderBy: { paidAt: "desc" }, include: { refunds: { select: { amount: true } } } } },
  });
  if (!b) return { ok: false, error: "That booking no longer exists." };
  if (!isActive(b.status)) return { ok: false, error: "This booking has already ended." };

  // Only one caller can end it: if two people (guest and host) press cancel together, the second one finds it already changed.
  const moved = await db.booking.updateMany({
    where: { id: b.id, status: b.status },
    data: { status: o.finalStatus ?? "CANCELLED", cancelledAt: o.now, cancelledBy: o.by, cancelReason: o.reason.slice(0, 300), expiresAt: null },
  });
  if (moved.count !== 1) return { ok: false, error: "This booking has just changed. Please refresh and try again." };

  await releaseSeats(db, b.sessionId, b.guests);

  const quote = cancellationQuote({ by: o.by, fullRefund: o.fullRefund, keepEverything: o.keepEverything, policy: b.cancellationPolicy, startsAt: b.session.startsAt, bookedAt: b.createdAt, now: o.now, totalAmount: b.totalAmount, paidAmount: b.paidAmount });
  const refunds: { id: string; amount: number; paymentId: string }[] = [];
  const pieces = allocateRefund(b.payments.map((p) => ({ ...p, refunded: p.refunds.reduce((n, r) => n + r.amount, 0) })), quote.refund);
  for (const { payment, amount } of pieces) {
    const row = await db.bookingRefund.create({ data: { bookingId: b.id, paymentId: payment.id, amount, method: payment.method, destination: payment.method === "MPESA" ? payment.phone : null, reason: o.reason.slice(0, 300) }, select: { id: true } });
    refunds.push({ id: row.id, amount, paymentId: payment.id });
  }
  if (pieces.length) await db.booking.update({ where: { id: b.id }, data: { refundedAmount: { increment: pieces.reduce((n, p) => n + p.amount, 0) } } });
  return { ok: true, bookingId: b.id, quote, refunds };
}

// ---------------------------------------------------------------------------------------------------------------------------
// The host's decision on a request
// ---------------------------------------------------------------------------------------------------------------------------
export async function acceptRequest(db: Db, bookingId: string, now: Date): Promise<{ ok: true; payBy: Date } | { ok: false; error: string }> {
  const b = await db.booking.findUnique({ where: { id: bookingId }, include: { session: { select: { startsAt: true, status: true } } } });
  if (!b || b.status !== "REQUESTED") return { ok: false, error: "This request is no longer waiting for an answer." };
  if (b.session.status !== "OPEN") return { ok: false, error: "That date is no longer open." };
  if (b.expiresAt && b.expiresAt <= now) return { ok: false, error: "This request has expired." };
  const payBy = payAfterAcceptExpiry(now, b.session.startsAt);
  if (!payBy) return { ok: false, error: "That date is too close now for the guest to pay. Please decline, or contact them." };
  const moved = await db.booking.updateMany({ where: { id: b.id, status: "REQUESTED" }, data: { status: "AWAITING_PAYMENT", expiresAt: payBy } });
  return moved.count === 1 ? { ok: true, payBy } : { ok: false, error: "This request has just changed. Please refresh." };
}

// ---------------------------------------------------------------------------------------------------------------------------
// A payment that has been CONFIRMED BY THE PROVIDER (never on a bare callback — see lib/booking-payments.ts)
// ---------------------------------------------------------------------------------------------------------------------------
export type PaidOutcome =
  | { outcome: "already" }
  | { outcome: "confirmed"; bookingId: string }
  | { outcome: "balance_paid"; bookingId: string }
  | { outcome: "revived"; bookingId: string }
  | { outcome: "refund_due"; bookingId: string; refundId: string; amount: number; why: string };

export async function applyPaidPayment(db: Db, paymentId: string, now: Date, proof: { receipt?: string | null; confirmationCode?: string | null }): Promise<PaidOutcome> {
  // Only the first caller moves PENDING -> PAID, so the same payment can never be counted twice (callback + poll + IPN all race).
  const moved = await db.bookingPayment.updateMany({ where: { id: paymentId, status: "PENDING" }, data: { status: "PAID", paidAt: now, failureReason: null, ...(proof.receipt ? { mpesaReceiptNumber: proof.receipt } : {}), ...(proof.confirmationCode ? { pesapalConfirmationCode: proof.confirmationCode } : {}) } });
  if (moved.count !== 1) return { outcome: "already" };

  const p = await db.bookingPayment.findUniqueOrThrow({ where: { id: paymentId } });
  const b = await db.booking.findUniqueOrThrow({ where: { id: p.bookingId }, include: { session: { select: { startsAt: true, status: true } } } });

  const refundAll = async (why: string): Promise<PaidOutcome> => {
    const r = await db.bookingRefund.create({ data: { bookingId: b.id, paymentId: p.id, amount: p.amount, method: p.method, destination: p.method === "MPESA" ? p.phone : null, reason: why }, select: { id: true } });
    await db.booking.update({ where: { id: b.id }, data: { refundedAmount: { increment: p.amount } } });
    return { outcome: "refund_due", bookingId: b.id, refundId: r.id, amount: p.amount, why };
  };

  const credit = async (extra: Prisma.BookingUpdateInput = {}) => db.booking.update({ where: { id: b.id }, data: { paidAmount: { increment: p.amount }, ...extra } });

  if (b.status === "AWAITING_PAYMENT" && (p.kind === "FULL" || p.kind === "DEPOSIT")) {
    // Never accept more than is owed: a second tap on "Pay" shouldn't cost the guest twice.
    if (b.paidAmount >= (p.kind === "DEPOSIT" ? b.depositAmount ?? b.totalAmount : b.totalAmount)) return refundAll("Duplicate payment — this booking was already paid.");
    await credit({ status: "CONFIRMED", confirmedAt: now, expiresAt: null });
    return { outcome: "confirmed", bookingId: b.id };
  }
  if (b.status === "CONFIRMED" && p.kind === "BALANCE") {
    if (b.paidAmount + p.amount > b.totalAmount) return refundAll("Duplicate payment — the balance was already paid.");
    await credit();
    return { outcome: "balance_paid", bookingId: b.id };
  }
  if (b.status === "EXPIRED" && (p.kind === "FULL" || p.kind === "DEPOSIT") && b.session.status === "OPEN" && b.session.startsAt > now) {
    // The hold lapsed while the guest was paying. If the seats are still free the booking is revived; if not, the money goes back.
    if (await holdSeats(db, b.sessionId, b.guests)) {
      await credit({ status: "CONFIRMED", confirmedAt: now, expiresAt: null, cancelledAt: null, cancelledBy: null, cancelReason: null });
      return { outcome: "revived", bookingId: b.id };
    }
    return refundAll("Your payment arrived after the hold on your seats had expired and the date has since sold out.");
  }
  return refundAll(b.status === "CONFIRMED" ? "Duplicate payment." : `Your payment arrived after this booking was ${b.status.toLowerCase().replace("_", " ")}.`);
}

/** Marks a payment attempt failed — but only if it is still waiting (so a late failure can't undo a success). */
export async function applyFailedPayment(db: Db, paymentId: string, reason: string): Promise<boolean> {
  const r = await db.bookingPayment.updateMany({ where: { id: paymentId, status: "PENDING" }, data: { status: "FAILED", failureReason: reason.slice(0, 300) } });
  return r.count === 1;
}

// ---------------------------------------------------------------------------------------------------------------------------
// A whole session cancelled by the host or an admin
// ---------------------------------------------------------------------------------------------------------------------------
export async function cancelSession(db: Db, sessionId: string, by: "HOST" | "ADMIN", reason: string, now: Date) {
  const s = await db.experienceSession.findUnique({ where: { id: sessionId }, select: { id: true, status: true } });
  if (!s) return { ok: false as const, error: "That date no longer exists." };
  if (s.status === "CANCELLED") return { ok: false as const, error: "That date is already cancelled." };
  await db.experienceSession.update({ where: { id: s.id }, data: { status: "CANCELLED" } }); // closed to new bookings first
  const bookings = await db.booking.findMany({ where: { sessionId: s.id, status: { in: ACTIVE_STATUSES } }, select: { id: true } });
  const ended: { bookingId: string; refunds: { id: string; amount: number }[]; refund: number }[] = [];
  for (const b of bookings) {
    const r = await endBooking(db, b.id, { by, reason, now, fullRefund: true });
    if (r.ok) ended.push({ bookingId: b.id, refunds: r.refunds, refund: r.quote.refund });
  }
  return { ok: true as const, ended };
}
