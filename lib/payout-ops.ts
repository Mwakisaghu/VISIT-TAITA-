// Host payouts: the database operations. Every step that must happen exactly once is an atomic claim (`payoutId: null -> this payout`,
// `status: PENDING -> PAID`), so two admins clicking at the same moment, or a double-click, can never pay a booking twice.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { classify, DEFAULT_COMMISSION_PERCENT, DEFAULT_HOLD_DAYS, keptAmount, normalizePayoutPhone, totalsFor, validReceipt, type EarningsState, type PayoutBooking, type PayoutSettingsValues } from "@/lib/payout";

type Db = typeof prisma;
const SETTINGS_ID = "singleton";
const EARNING_STATUSES = ["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"];

export async function getSettings(db: Db | Prisma.TransactionClient = prisma): Promise<PayoutSettingsValues> {
  const row = await db.payoutSettings.findUnique({ where: { id: SETTINGS_ID } });
  return row ? { commissionPercent: row.commissionPercent, holdDays: row.holdDays } : { commissionPercent: DEFAULT_COMMISSION_PERCENT, holdDays: DEFAULT_HOLD_DAYS };
}

export async function saveSettings(db: Db, values: PayoutSettingsValues, actorId: string) {
  await db.payoutSettings.upsert({ where: { id: SETTINGS_ID }, create: { id: SETTINGS_ID, ...values, updatedById: actorId }, update: { ...values, updatedById: actorId } });
}

const bookingSelect = {
  id: true, reference: true, status: true, paidAmount: true, refundedAmount: true, completedAt: true, cancelledAt: true, payoutId: true, guests: true,
  session: { select: { startsAt: true } }, experience: { select: { name: true, ownerId: true } },
} as const;

export type EarningRow = { id: string; reference: string; experience: string; hostId: string; startsAt: Date; paid: number; refunded: number; kept: number; state: EarningsState; booking: PayoutBooking };

/** The earnings picture: every booking that could earn (or has earned) money, with where it stands. */
export async function loadEarnings(db: Db, o: { hostId?: string; now: Date; holdDays: number; take?: number }): Promise<EarningRow[]> {
  const rows = await db.booking.findMany({
    // Experiences Visit Taita runs itself have no host (ownerId empty): their bookings never produce a payout.
    where: { status: { in: EARNING_STATUSES as never }, paidAmount: { gt: 0 }, experience: { ownerId: o.hostId ?? { not: null } } },
    select: bookingSelect, orderBy: { createdAt: "asc" }, take: o.take ?? 5000,
  });
  return rows.filter((r) => r.experience.ownerId).map((r) => {
    const pb: PayoutBooking = { id: r.id, status: r.status, paidAmount: r.paidAmount, refundedAmount: r.refundedAmount, completedAt: r.completedAt, cancelledAt: r.cancelledAt, sessionStartsAt: r.session.startsAt, payoutId: r.payoutId };
    return { id: r.id, reference: r.reference, experience: r.experience.name, hostId: r.experience.ownerId as string, startsAt: r.session.startsAt, paid: r.paidAmount, refunded: r.refundedAmount, kept: keptAmount(pb), state: classify(pb, o.now, o.holdDays), booking: pb };
  });
}

export type PrepareResult = { created: Array<{ id: string; hostId: string; hostName: string; amount: number; bookingCount: number }>; skipped: Array<{ hostId: string; hostName: string; reason: string }> };

/** Prepares a payout for each host (or one host) with earnings that are payable now. Hosts without a valid payout number are skipped and named. */
export async function createPayouts(db: Db, o: { hostId?: string; now: Date; actorId: string }): Promise<PrepareResult> {
  const settings = await getSettings(db);
  const payable = (await loadEarnings(db, { hostId: o.hostId, now: o.now, holdDays: settings.holdDays })).filter((r) => r.state === "payable");
  const byHost = new Map<string, string[]>();
  for (const r of payable) byHost.set(r.hostId, [...(byHost.get(r.hostId) ?? []), r.id]);

  const out: PrepareResult = { created: [], skipped: [] };
  for (const [hostId, ids] of byHost) {
    const host = await db.user.findUnique({ where: { id: hostId }, select: { id: true, name: true, payoutPhone: true } });
    if (!host) { out.skipped.push({ hostId, hostName: "(deleted account)", reason: "the account no longer exists" }); continue; }
    const phone = normalizePayoutPhone(host.payoutPhone);
    if (!phone) { out.skipped.push({ hostId, hostName: host.name, reason: host.payoutPhone ? "their payout number isn't a valid Safaricom number" : "they haven't registered a payout number" }); continue; }

    const made = await db.$transaction(async (tx) => {
      const p = await tx.hostPayout.create({ data: { hostId, grossAmount: 0, commissionPercent: settings.commissionPercent, commissionAmount: 0, amount: 0, bookingCount: 0, destination: phone, createdById: o.actorId } });
      // The claim: only bookings still free are taken, so a second admin (or a second click) gets nothing and no booking is in two payouts.
      const claimed = await tx.booking.updateMany({ where: { id: { in: ids }, payoutId: null, status: { in: EARNING_STATUSES as never } }, data: { payoutId: p.id } });
      if (claimed.count === 0) { await tx.hostPayout.delete({ where: { id: p.id } }); return null; }
      const rows = await tx.booking.findMany({ where: { payoutId: p.id }, select: { paidAmount: true, refundedAmount: true } });
      const t = totalsFor(rows, settings.commissionPercent);
      if (t.net <= 0) { await tx.booking.updateMany({ where: { payoutId: p.id }, data: { payoutId: null } }); await tx.hostPayout.delete({ where: { id: p.id } }); return null; }
      return tx.hostPayout.update({ where: { id: p.id }, data: { grossAmount: t.gross, commissionAmount: t.commission, amount: t.net, bookingCount: t.count } });
    });
    if (made) out.created.push({ id: made.id, hostId, hostName: host.name, amount: made.amount, bookingCount: made.bookingCount });
  }
  return out;
}

export type RecordResult = { ok: true; payout: { id: string; hostId: string; amount: number; bookingCount: number; destination: string; reference: string | null; status: string } } | { ok: false; error: string };

/** Records the outcome of sending a payout. SENT needs the M-Pesa receipt; CANCEL needs a reason and releases the bookings for the next payout. */
export async function recordPayout(db: Db, id: string, o: { outcome: "SENT" | "CANCEL"; reference?: string; note?: string; actorId: string; now: Date }): Promise<RecordResult> {
  const reference = (o.reference ?? "").trim(); const note = (o.note ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (o.outcome === "SENT" && !validReceipt(reference)) return { ok: false, error: "Enter the M-Pesa receipt of the payment you sent (letters and numbers, 4–40 characters)." };
  if (o.outcome === "CANCEL" && note.length < 3) return { ok: false, error: "Say why it wasn't sent (a few words) — the host will not see this, but other admins will." };
  return db.$transaction(async (tx) => {
    const claimed = await tx.hostPayout.updateMany({
      where: { id, status: "PENDING" },
      data: { status: o.outcome === "SENT" ? "PAID" : "CANCELLED", reference: o.outcome === "SENT" ? reference : null, note: note || null, processedAt: o.now, processedById: o.actorId },
    });
    if (claimed.count !== 1) return { ok: false as const, error: "That payout has already been recorded (or doesn't exist)." };
    if (o.outcome === "CANCEL") await tx.booking.updateMany({ where: { payoutId: id }, data: { payoutId: null } });
    const p = await tx.hostPayout.findUniqueOrThrow({ where: { id } });
    return { ok: true as const, payout: { id: p.id, hostId: p.hostId, amount: p.amount, bookingCount: p.bookingCount, destination: p.destination, reference: p.reference, status: p.status } };
  });
}

/** What a host sees: money coming, money held, money ready, and their payouts with a line for each booking. */
export async function hostOverview(db: Db, hostId: string, now: Date) {
  const settings = await getSettings(db);
  const rows = await loadEarnings(db, { hostId, now, holdDays: settings.holdDays });
  const of = (state: EarningsState) => rows.filter((r) => r.state === state);
  const est = (list: EarningRow[]) => totalsFor(list.map((r) => ({ paidAmount: r.paid, refundedAmount: r.refunded })), settings.commissionPercent);
  const payouts = await db.hostPayout.findMany({
    where: { hostId }, orderBy: { createdAt: "desc" }, take: 50,
    include: { bookings: { select: { id: true, reference: true, paidAmount: true, refundedAmount: true, experience: { select: { name: true } }, session: { select: { startsAt: true } } } } },
  });
  return { settings, upcoming: est(of("upcoming")), waiting: est(of("waiting")), payable: est(of("payable")), payouts };
}
