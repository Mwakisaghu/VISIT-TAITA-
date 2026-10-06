// The scheduled work for bookings, run from the same cron job as the email retries. Every step is isolated: one failing never
// stops the others, and every step is safe to run twice.
import { ACTIVE_STATUSES } from "@/lib/booking";
import { endBooking } from "@/lib/booking-ops";
import { notifyBooking } from "@/lib/booking-emails";
import { syncPayment } from "@/lib/booking-payments";
import { prisma } from "@/lib/prisma";

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;

export type BookingJobSummary = { paymentsChecked: number; holdsExpired: number; requestsExpired: number; reminders: number; balancesLapsed: number; completed: number; seatCountsFixed: number; errors: number };

export async function processBookingsDue(now: Date = new Date()): Promise<BookingJobSummary> {
  const s: BookingJobSummary = { paymentsChecked: 0, holdsExpired: 0, requestsExpired: 0, reminders: 0, balancesLapsed: 0, completed: 0, seatCountsFixed: 0, errors: 0 };
  const step = async (name: string, fn: () => Promise<void>) => { try { await fn(); } catch (e) { s.errors++; console.error(`[bookings job] ${name} failed:`, (e as Error).message); } };

  // 1. Payments still waiting: ask the provider. This is what rescues a payment whose callback never arrived. (A payment is NEVER
  //    failed just because time passed: a card payment can complete long after it was started.)
  await step("pending payments", async () => {
    const pending = await prisma.bookingPayment.findMany({ where: { status: "PENDING", createdAt: { lt: new Date(now.getTime() - 90_000), gt: new Date(now.getTime() - 7 * DAY) } }, select: { id: true }, orderBy: { createdAt: "asc" }, take: 50 });
    for (const p of pending) { await syncPayment(p.id, {}, now); s.paymentsChecked++; }
  });

  // 2. Seats held for a payment that never came — unless a payment is still being resolved (then the check above decides).
  await step("expire unpaid holds", async () => {
    const due = await prisma.booking.findMany({ where: { status: "AWAITING_PAYMENT", expiresAt: { lte: now } }, select: { id: true }, take: 100 });
    for (const b of due) {
      if (await prisma.bookingPayment.findFirst({ where: { bookingId: b.id, status: "PENDING", createdAt: { gt: new Date(now.getTime() - 10 * MIN) } }, select: { id: true } })) continue;
      const r = await prisma.$transaction((tx) => endBooking(tx, b.id, { by: "SYSTEM", reason: "Payment wasn't completed in time.", now, finalStatus: "EXPIRED" }));
      if (r.ok) { s.holdsExpired++; await notifyBooking(b.id, { kind: "expired", why: "unpaid" }); }
    }
  });

  // 3. Requests the host never answered.
  await step("expire unanswered requests", async () => {
    const due = await prisma.booking.findMany({ where: { status: "REQUESTED", expiresAt: { lte: now } }, select: { id: true }, take: 100 });
    for (const b of due) {
      const r = await prisma.$transaction((tx) => endBooking(tx, b.id, { by: "SYSTEM", reason: "The host didn't respond in time.", now, finalStatus: "EXPIRED" }));
      if (r.ok) { s.requestsExpired++; await notifyBooking(b.id, { kind: "expired", why: "no_answer" }); }
    }
  });

  // 4. Balance due within 48 hours: remind once.
  await step("balance reminders", async () => {
    const due = await prisma.booking.findMany({ where: { status: "CONFIRMED", balanceReminderSentAt: null, balanceDueAt: { gt: now, lte: new Date(now.getTime() + 2 * DAY) } }, select: { id: true, paidAmount: true, totalAmount: true }, take: 100 });
    for (const b of due) {
      if (b.paidAmount >= b.totalAmount) continue;
      const claimed = await prisma.booking.updateMany({ where: { id: b.id, balanceReminderSentAt: null }, data: { balanceReminderSentAt: now } });
      if (claimed.count === 1) { await notifyBooking(b.id, { kind: "balanceReminder" }); s.reminders++; }
    }
  });

  // 5. Balance not paid by the due date: the booking is cancelled and the deposit kept, as the guest agreed when booking.
  await step("lapse unpaid balances", async () => {
    const due = await prisma.booking.findMany({ where: { status: "CONFIRMED", balanceDueAt: { lte: now } }, select: { id: true, paidAmount: true, totalAmount: true }, take: 100 });
    for (const b of due) {
      if (b.paidAmount >= b.totalAmount) continue;
      if (await prisma.bookingPayment.findFirst({ where: { bookingId: b.id, status: "PENDING", createdAt: { gt: new Date(now.getTime() - 10 * MIN) } }, select: { id: true } })) continue;
      const r = await prisma.$transaction((tx) => endBooking(tx, b.id, { by: "SYSTEM", reason: "The balance wasn't paid by the due date.", now, keepEverything: true }));
      if (r.ok) { s.balancesLapsed++; await notifyBooking(b.id, { kind: "balanceNotPaid" }); }
    }
  });

  // 6. Experiences that have taken place (6 hours after the start) are marked completed.
  await step("complete past bookings", async () => {
    const done = await prisma.booking.updateMany({ where: { status: "CONFIRMED", session: { startsAt: { lte: new Date(now.getTime() - 6 * HOUR) } } }, data: { status: "COMPLETED", completedAt: now } });
    s.completed = done.count;
  });

  // 7. Keep each date's seat counter honest: it must equal the seats of its live bookings. A drift is corrected and counted.
  await step("reconcile seat counters", async () => {
    const sessions = await prisma.experienceSession.findMany({ where: { startsAt: { gt: new Date(now.getTime() - 2 * DAY) } }, select: { id: true, seatsTaken: true }, take: 2000 });
    const sums = await prisma.booking.groupBy({ by: ["sessionId"], where: { status: { in: ACTIVE_STATUSES } }, _sum: { guests: true } });
    const live = new Map(sums.map((x) => [x.sessionId, x._sum.guests ?? 0]));
    for (const row of sessions) {
      const want = live.get(row.id) ?? 0;
      if (want !== row.seatsTaken) {
        const fixed = await prisma.experienceSession.updateMany({ where: { id: row.id, seatsTaken: row.seatsTaken }, data: { seatsTaken: want } });
        if (fixed.count === 1) { s.seatCountsFixed++; console.error(`[bookings job] seat counter for ${row.id} was ${row.seatsTaken}, corrected to ${want}`); }
      }
    }
  });
  return s;
}
