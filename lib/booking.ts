// Experience bookings: the rules, as pure functions (no database, no clock of their own, no Node-only imports — the booking page
// runs this in the browser too). Everything about money, deadlines and
// refunds is decided here so it can be tested exhaustively. Whole Kenyan shillings throughout — never fractions.

export type CancellationPolicyKey = "FLEXIBLE" | "MODERATE" | "STRICT";
export type PaymentModeKey = "FULL" | "DEPOSIT" | "AFTER_CONFIRMATION";
export type BookingStatusKey = "REQUESTED" | "AWAITING_PAYMENT" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "DECLINED" | "EXPIRED" | "NO_SHOW";

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
/** East Africa Time is UTC+3 all year (Kenya has no daylight saving), so a fixed offset is exact. */
export const EAT_OFFSET_MS = 3 * HOUR;

/** Statuses that hold seats. */
export const ACTIVE_STATUSES: BookingStatusKey[] = ["REQUESTED", "AWAITING_PAYMENT", "CONFIRMED"];
export const isActive = (s: string) => (ACTIVE_STATUSES as string[]).includes(s);

export const HOLD_MINUTES = 30; // an unpaid booking keeps its seats this long
export const REQUEST_RESPONSE_HOURS = 48; // a host has this long to answer a request
export const PAY_AFTER_ACCEPT_HOURS = 24; // after a host accepts, the guest has this long to pay
export const COOLING_OFF_HOURS = 24; // full refund within this long of booking...
export const COOLING_OFF_MIN_LEAD_HOURS = 48; // ...as long as the experience is more than this far away when booked

// ---------------------------------------------------------------------------------------------------------------------------
// Cancellation policies. Researched from Airbnb Experiences, Viator, GetYourGuide and Withlocals (full refund up to 24 h before is
// the market norm; some listings use 3 or 7 days) and Kenyan operators (graduated penalties, strictest close to departure).
// ---------------------------------------------------------------------------------------------------------------------------
export const POLICIES: Record<CancellationPolicyKey, { label: string; tiers: { minHours: number; percent: number }[]; lines: string[] }> = {
  FLEXIBLE: { label: "Flexible", tiers: [{ minHours: 24, percent: 100 }], lines: ["Full refund if you cancel at least 24 hours before the start.", "No refund after that."] },
  MODERATE: { label: "Moderate", tiers: [{ minHours: 72, percent: 100 }, { minHours: 24, percent: 50 }], lines: ["Full refund if you cancel at least 3 days before the start.", "50% refund from 3 days down to 24 hours before.", "No refund within 24 hours of the start."] },
  STRICT: { label: "Strict", tiers: [{ minHours: 168, percent: 100 }, { minHours: 72, percent: 50 }], lines: ["Full refund if you cancel at least 7 days before the start.", "50% refund from 7 days down to 3 days before.", "No refund within 3 days of the start."] },
};

/** Rules that apply to every booking, whatever the host's policy. Shown to the guest before they pay, and in the Terms. */
export const COMMON_RULES: string[] = [
  "Cooling-off: cancel within 24 hours of booking for a full refund, as long as the experience is more than 48 hours away when you book.",
  "If the host cancels, or we have to cancel (for example for weather, safety or an emergency), you get a full refund — or a free move to another date if you prefer.",
  "If something serious stops you coming (illness, a death in the family, a disaster), tell us: we can override the policy and refund you in full.",
  "No-shows are not refunded. We never charge you more than you have already paid.",
  "Refunds go back to the M-Pesa number (or card) you paid with. M-Pesa refunds are sent by us by hand, normally within 3 working days.",
];

export const isPolicy = (v: unknown): v is CancellationPolicyKey => typeof v === "string" && Object.prototype.hasOwnProperty.call(POLICIES, v);
export const isPaymentMode = (v: unknown): v is PaymentModeKey => v === "FULL" || v === "DEPOSIT" || v === "AFTER_CONFIRMATION";

export type RefundBasis = "cooling_off" | "policy" | "started";

/** What share (0–100) of the price a guest is refunded if THEY cancel at `now`. Boundaries are inclusive: "until 24 hours before" includes exactly 24 hours. */
export function refundPercent(a: { policy: CancellationPolicyKey; startsAt: Date; bookedAt: Date; now: Date }): { percent: number; basis: RefundBasis } {
  const toStart = a.startsAt.getTime() - a.now.getTime();
  if (toStart <= 0) return { percent: 0, basis: "started" };
  if (a.now.getTime() - a.bookedAt.getTime() <= COOLING_OFF_HOURS * HOUR && a.startsAt.getTime() - a.bookedAt.getTime() > COOLING_OFF_MIN_LEAD_HOURS * HOUR) return { percent: 100, basis: "cooling_off" };
  const hours = toStart / HOUR;
  const tier = [...POLICIES[a.policy].tiers].sort((x, y) => y.minHours - x.minHours).find((t) => hours >= t.minHours);
  return { percent: tier ? tier.percent : 0, basis: "policy" };
}

/**
 * Splits what was paid into "refund" and "kept". The host keeps (100 − percent)% of the PRICE, but never more than was actually
 * paid — a guest who paid only a deposit is never chased for the rest.
 */
export function computeRefund(a: { totalAmount: number; paidAmount: number; percent: number }): { refund: number; retained: number } {
  const percent = Math.min(100, Math.max(0, Math.round(a.percent)));
  const owedToHost = Math.round((a.totalAmount * (100 - percent)) / 100);
  const retained = Math.min(a.paidAmount, owedToHost);
  return { refund: Math.max(0, a.paidAmount - retained), retained };
}

export type CancelBy = "GUEST" | "HOST" | "ADMIN" | "SYSTEM";

/**
 * The refund for a cancellation. A guest — or an admin cancelling on a guest's behalf — is bound by the policy UNLESS `fullRefund`
 * (the "extenuating circumstances" override) is set. A host cancelling, and the system ending a booking, always refund in full.
 */
export function cancellationQuote(a: { by: CancelBy; fullRefund?: boolean; policy: CancellationPolicyKey; startsAt: Date; bookedAt: Date; now: Date; totalAmount: number; paidAmount: number; keepEverything?: boolean }) {
  let percent: number, basis: RefundBasis | "host" | "override" | "unpaid_balance";
  if (a.keepEverything) ({ percent, basis } = { percent: 0, basis: "unpaid_balance" });
  else if ((a.by === "GUEST" || a.by === "ADMIN") && !a.fullRefund) ({ percent, basis } = refundPercent({ policy: a.policy, startsAt: a.startsAt, bookedAt: a.bookedAt, now: a.now }));
  else ({ percent, basis } = { percent: 100, basis: a.by === "HOST" || a.by === "SYSTEM" ? "host" : "override" });
  return { percent, basis, ...computeRefund({ totalAmount: a.totalAmount, paidAmount: a.paidAmount, percent }) };
}

export const pricePerBooking = (unitPrice: number, guests: number) => unitPrice * guests;

export type PaymentPlan = { mode: PaymentModeKey; dueNow: number; depositAmount: number | null; balanceDueAt: Date | null; collapsedToFull: boolean };

/**
 * What to collect now and when. A deposit booking made too close to the start (so the balance would already be due or nearly so)
 * becomes pay-in-full. For "after confirmation" nothing is collected until the host accepts; the whole price is then due.
 */
export function planPayments(a: { mode: PaymentModeKey; totalAmount: number; depositPercent: number; balanceDueDays: number; startsAt: Date; now: Date }): PaymentPlan {
  if (a.mode === "DEPOSIT") {
    const balanceDueAt = new Date(a.startsAt.getTime() - a.balanceDueDays * DAY);
    const deposit = Math.round((a.totalAmount * a.depositPercent) / 100);
    if (a.totalAmount < 2 || balanceDueAt.getTime() - a.now.getTime() < 12 * HOUR) return { mode: "FULL", dueNow: a.totalAmount, depositAmount: null, balanceDueAt: null, collapsedToFull: true };
    const depositAmount = Math.min(a.totalAmount - 1, Math.max(1, deposit));
    return { mode: "DEPOSIT", dueNow: depositAmount, depositAmount, balanceDueAt, collapsedToFull: false };
  }
  return { mode: a.mode, dueNow: a.totalAmount, depositAmount: null, balanceDueAt: null, collapsedToFull: false };
}

/** When an unanswered request lapses: 48 hours, but never later than 6 hours before the start. Null if that leaves under an hour. */
export function requestExpiry(now: Date, startsAt: Date): Date | null {
  const t = Math.min(now.getTime() + REQUEST_RESPONSE_HOURS * HOUR, startsAt.getTime() - 6 * HOUR);
  return t - now.getTime() >= HOUR ? new Date(t) : null;
}
/** After a host accepts: the guest has 24 hours to pay, but never past 3 hours before the start. Null if that leaves under 30 minutes. */
export function payAfterAcceptExpiry(now: Date, startsAt: Date): Date | null {
  const t = Math.min(now.getTime() + PAY_AFTER_ACCEPT_HOURS * HOUR, startsAt.getTime() - 3 * HOUR);
  return t - now.getTime() >= 30 * 60 * 1000 ? new Date(t) : null;
}
export const holdExpiry = (now: Date) => new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);

export type BookableExperience = { bookingEnabled: boolean; priceFrom: number | null; status: string; bookingCutoffHours: number; maxGuestsPerBooking: number; paymentMode: PaymentModeKey };
export type BookableSession = { status: string; startsAt: Date; capacity: number; seatsTaken: number };

export const seatsLeft = (s: { capacity: number; seatsTaken: number }) => Math.max(0, s.capacity - s.seatsTaken);

/** Whether this exact booking may be made now. The server runs this again at the moment of booking: the page is only a convenience. */
export function validateBookingRequest(a: { experience: BookableExperience; session: BookableSession; guests: unknown; now: Date }): { ok: true; guests: number } | { ok: false; error: string } {
  const no = (error: string) => ({ ok: false as const, error });
  const e = a.experience, s = a.session;
  if (e.status !== "PUBLISHED" || !e.bookingEnabled) return no("This experience can't be booked online right now.");
  if (!e.priceFrom || e.priceFrom < 1) return no("This experience doesn't have a price yet.");
  if (s.status !== "OPEN") return no("That date is no longer available.");
  if (s.startsAt.getTime() - e.bookingCutoffHours * HOUR <= a.now.getTime()) return no(`Booking for that date has closed (it closes ${e.bookingCutoffHours} hours before the start).`);
  const guests = typeof a.guests === "number" ? a.guests : typeof a.guests === "string" && /^\d{1,3}$/.test(a.guests) ? Number(a.guests) : NaN;
  if (!Number.isInteger(guests) || guests < 1) return no("Choose how many guests are coming.");
  if (guests > e.maxGuestsPerBooking) return no(`You can book up to ${e.maxGuestsPerBooking} guests at a time.`);
  if (guests > seatsLeft(s)) return no(seatsLeft(s) === 0 ? "That date is fully booked." : `Only ${seatsLeft(s)} seat${seatsLeft(s) === 1 ? "" : "s"} left on that date.`);
  if (e.paymentMode === "AFTER_CONFIRMATION" && !requestExpiry(a.now, s.startsAt)) return no("That date is too close for a request that needs the host's approval.");
  return { ok: true, guests };
}

// ---------------------------------------------------------------------------------------------------------------------------
// References, refunds and East Africa Time
// ---------------------------------------------------------------------------------------------------------------------------
/** Spreads a refund over the payments it came from, newest first, so each M-Pesa refund goes to the phone that paid. */
export function allocateRefund<T extends { id: string; amount: number; refunded: number }>(payments: T[], refund: number): { payment: T; amount: number }[] {
  const out: { payment: T; amount: number }[] = [];
  let left = refund;
  for (const p of payments) {
    if (left <= 0) break;
    const room = Math.max(0, p.amount - p.refunded);
    const take = Math.min(left, room);
    if (take > 0) { out.push({ payment: p, amount: take }); left -= take; }
  }
  return out;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const eat = (d: Date) => new Date(d.getTime() + EAT_OFFSET_MS);
export function formatEat(d: Date): string { const e = eat(d); return `${DOW[e.getUTCDay()]} ${e.getUTCDate()} ${MON[e.getUTCMonth()]} ${e.getUTCFullYear()}, ${pad(e.getUTCHours())}:${pad(e.getUTCMinutes())} EAT`; }
export function formatEatDate(d: Date): string { const e = eat(d); return `${DOW[e.getUTCDay()]} ${e.getUTCDate()} ${MON[e.getUTCMonth()]} ${e.getUTCFullYear()}`; }
export function toEatInputs(d: Date): { date: string; time: string } { const e = eat(d); return { date: `${e.getUTCFullYear()}-${pad(e.getUTCMonth() + 1)}-${pad(e.getUTCDate())}`, time: `${pad(e.getUTCHours())}:${pad(e.getUTCMinutes())}` }; }

/** A date and time typed by a host (East Africa Time) -> the instant it means. Null if either isn't a real date/time. */
export function parseEatLocal(date: unknown, time: unknown): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date ?? "")), t = /^(\d{2}):(\d{2})$/.exec(String(time ?? ""));
  if (!d || !t) return null;
  const [y, mo, da, h, mi] = [Number(d[1]), Number(d[2]), Number(d[3]), Number(t[1]), Number(t[2])];
  if (mo < 1 || mo > 12 || da < 1 || da > 31 || h > 23 || mi > 59 || y < 2020 || y > 2100) return null;
  const check = new Date(Date.UTC(y, mo - 1, da));
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== da) return null; // 31 February etc.
  return new Date(Date.UTC(y, mo - 1, da, h, mi) - EAT_OFFSET_MS);
}

export const MAX_REPEAT_WEEKS = 26;
/** The same day and time each week (no daylight saving in Kenya, so seven days is exactly seven days). */
export const expandWeekly = (first: Date, weeks: number): Date[] => Array.from({ length: Math.min(MAX_REPEAT_WEEKS, Math.max(1, Math.floor(weeks))) }, (_, i) => new Date(first.getTime() + i * 7 * DAY));

// ---------------------------------------------------------------------------------------------------------------------------
// Wording
// ---------------------------------------------------------------------------------------------------------------------------
export const policyLabel = (p: CancellationPolicyKey) => POLICIES[p].label;
export const policyLines = (p: CancellationPolicyKey) => POLICIES[p].lines;

export function paymentModeSummary(mode: PaymentModeKey, depositPercent: number, balanceDueDays: number): string {
  if (mode === "DEPOSIT") return `Pay a ${depositPercent}% deposit now to hold your place, and the rest ${balanceDueDays} day${balanceDueDays === 1 ? "" : "s"} before the start.`;
  if (mode === "AFTER_CONFIRMATION") return "Send a request. The host replies within 48 hours; if they accept you then pay, and nothing is charged before that.";
  return "Pay the full price now to confirm your place.";
}

export const STATUS_LABELS: Record<string, string> = { REQUESTED: "Waiting for the host", AWAITING_PAYMENT: "Awaiting payment", CONFIRMED: "Confirmed", COMPLETED: "Completed", CANCELLED: "Cancelled", DECLINED: "Declined by the host", EXPIRED: "Expired", NO_SHOW: "No-show" };
export const bookingStatusLabel = (s: string) => STATUS_LABELS[s] ?? s;

export type DueFields = { status: string; paymentMode: PaymentModeKey; totalAmount: number; depositAmount: number | null; paidAmount: number };
/** What the guest should pay next, if anything: the deposit or full price while the seats are held, then the balance. */
export function nextPaymentDue(b: DueFields): { kind: "FULL" | "DEPOSIT" | "BALANCE"; amount: number } | null {
  if (b.status === "AWAITING_PAYMENT") {
    if (b.paymentMode === "DEPOSIT" && b.depositAmount) return { kind: "DEPOSIT", amount: Math.max(0, b.depositAmount - b.paidAmount) };
    return { kind: "FULL", amount: Math.max(0, b.totalAmount - b.paidAmount) };
  }
  if (b.status === "CONFIRMED" && b.paidAmount < b.totalAmount) return { kind: "BALANCE", amount: b.totalAmount - b.paidAmount };
  return null;
}
