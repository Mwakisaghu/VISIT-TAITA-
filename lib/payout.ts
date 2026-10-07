// Host payouts: the rules, as pure functions (no database, no clock of their own).
//
// THE MODEL
//  * Guests pay Visit Taita. A host is owed what the guests paid and KEPT (paid minus refunds), less Visit Taita's commission.
//  * A booking earns money when it has happened: completed, a no-show (never refunded), or cancelled with some of the money kept under the
//    cancellation policy (a late cancellation, or an unpaid balance that cost the guest their deposit).
//  * Earnings are held for a few days after that (holdDays) so a dispute can be raised, then become PAYABLE.
//  * An admin prepares a payout per host, sends it by M-Pesa by hand (like refunds) and records the receipt.
//  * The commission rate is applied when a payout is PREPARED and written onto it; changing the rate affects only payouts prepared after.
//  * Whole shillings only. The commission is rounded per booking and the host receives the remainder, so nothing is lost or invented.

export const DEFAULT_COMMISSION_PERCENT = 10;
export const DEFAULT_HOLD_DAYS = 2;
export const MAX_COMMISSION_PERCENT = 50;
export const MAX_HOLD_DAYS = 30;
const DAY_MS = 86_400_000;

export type PayoutSettingsValues = { commissionPercent: number; holdDays: number };

const wholeNumber = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isInteger(n) ? n : null;
};

export function validateSettings(input: { commissionPercent?: unknown; holdDays?: unknown }): { ok: true; values: PayoutSettingsValues } | { ok: false; error: string } {
  const commissionPercent = wholeNumber(input.commissionPercent);
  if (commissionPercent === null || commissionPercent < 0 || commissionPercent > MAX_COMMISSION_PERCENT) return { ok: false, error: `The commission must be a whole number between 0% and ${MAX_COMMISSION_PERCENT}%.` };
  const holdDays = wholeNumber(input.holdDays);
  if (holdDays === null || holdDays < 0 || holdDays > MAX_HOLD_DAYS) return { ok: false, error: `The holding period must be a whole number of days between 0 and ${MAX_HOLD_DAYS}.` };
  return { ok: true, values: { commissionPercent, holdDays } };
}

/** Splits money kept into Visit Taita's commission and the host's share. The commission is rounded to the nearest shilling; the host gets the rest. */
export function splitAmount(gross: number, percent: number): { gross: number; commission: number; net: number } {
  const g = Number.isFinite(gross) ? Math.max(0, Math.round(gross)) : 0;
  const p = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  const commission = Math.min(g, Math.round((g * p) / 100));
  return { gross: g, commission, net: g - commission };
}

export type PayoutBooking = {
  id: string;
  status: string;
  paidAmount: number;
  refundedAmount: number;
  completedAt: Date | null;
  cancelledAt: Date | null;
  sessionStartsAt: Date;
  payoutId: string | null;
};

/** What the guest paid and Visit Taita kept after refunds. */
export const keptAmount = (b: Pick<PayoutBooking, "paidAmount" | "refundedAmount">): number => Math.max(0, (b.paidAmount || 0) - (b.refundedAmount || 0));

/** When this booking's money was earned (the experience took place, or the date passed after a cancellation), or null if it hasn't been. */
export function earnedAt(b: PayoutBooking): Date | null {
  if (b.status === "COMPLETED" || b.status === "NO_SHOW") return new Date(Math.max(b.sessionStartsAt.getTime(), (b.completedAt ?? b.sessionStartsAt).getTime()));
  if (b.status === "CANCELLED") return new Date(Math.max(b.sessionStartsAt.getTime(), (b.cancelledAt ?? b.sessionStartsAt).getTime()));
  return null;
}

export const payableAt = (b: PayoutBooking, holdDays: number): Date | null => {
  const e = earnedAt(b);
  return e ? new Date(e.getTime() + Math.max(0, holdDays) * DAY_MS) : null;
};

export type EarningsState =
  | "in_payout" // already part of a payout (pending or paid: the payout says which)
  | "payable" // earned, held long enough: can go into a payout now
  | "waiting" // earned, but still inside the holding period (or the experience has just happened and isn't marked completed yet)
  | "upcoming" // paid and confirmed, the experience hasn't happened yet
  | "nothing"; // no money kept (unpaid, or fully refunded) or not a kind of booking that earns

export function classify(b: PayoutBooking, now: Date, holdDays: number): EarningsState {
  if (b.payoutId) return "in_payout";
  if (keptAmount(b) <= 0) return "nothing";
  if (b.status === "CONFIRMED") return b.sessionStartsAt.getTime() > now.getTime() ? "upcoming" : "waiting";
  const at = payableAt(b, holdDays);
  if (!at) return "nothing";
  return at.getTime() <= now.getTime() ? "payable" : "waiting";
}

/** The totals for a set of bookings at a commission rate, with the commission rounded booking by booking. */
export function totalsFor(bookings: Array<Pick<PayoutBooking, "paidAmount" | "refundedAmount">>, percent: number) {
  let gross = 0, commission = 0;
  for (const b of bookings) { const s = splitAmount(keptAmount(b), percent); gross += s.gross; commission += s.commission; }
  return { gross, commission, net: gross - commission, count: bookings.length };
}

/** A host's payout number as Safaricom wants it (2547… or 2541…), or null if it isn't a Safaricom number. */
export function normalizePayoutPhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.replace(/[\s\-()]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (/^0[71]\d{8}$/.test(s)) s = "254" + s.slice(1);
  else if (/^[71]\d{8}$/.test(s)) s = "254" + s;
  return /^254[71]\d{8}$/.test(s) ? s : null;
}

/** 254712345678 -> 2547••••5678, for places a full number shouldn't appear (emails, logs). */
export const maskPhone = (p: string): string => (p.length >= 8 ? `${p.slice(0, 4)}••••${p.slice(-4)}` : "••••");

/** The receipt an admin enters after sending the money: letters and digits only, as M-Pesa receipts are. */
export const validReceipt = (r: unknown): r is string => typeof r === "string" && /^[A-Za-z0-9]{4,40}$/.test(r.trim());
export const kes = (n: number): string => `KES ${Math.round(n).toLocaleString("en-KE")}`;
