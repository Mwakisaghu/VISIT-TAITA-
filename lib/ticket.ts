// Event tickets: the rules, as pure functions (no database, no clock of their own, no Node-only imports — the ticket panel runs this in the browser too).
//
//  * An event has a ticketing mode: OFF (just listed), FREE (a ticket is issued at once — for collaborations) or PAID.
//  * PAID events are paid to the ORGANISER with the instructions set on the event (a Paybill and account, a Till, a phone number, a bank account…).
//    This site never sees that money, so a reservation stays PENDING until the organiser (or an admin) confirms the payment arrived.
//    An unconfirmed reservation is released after a few hours so seats aren't held forever.
//  * Every ticket has a number that is unique within its event (SAG-0042) — easy to say and type at the door — and a separate random secret
//    that the QR code carries, so knowing or guessing a number can't produce a working QR.

export type TicketModeKey = "OFF" | "FREE" | "PAID";
export type PayMethodKey = "PAYBILL" | "TILL" | "SEND_MONEY" | "BANK" | "OTHER";
export type TicketStatusKey = "PENDING_PAYMENT" | "VALID" | "USED" | "CANCELLED" | "EXPIRED";

/** Tickets in these states take a seat and count towards a person's limit. */
export const LIVE_STATUSES: TicketStatusKey[] = ["PENDING_PAYMENT", "VALID", "USED"];
export const MAX_PRICE = 1_000_000;
export const MAX_CAPACITY = 100_000;
const HOUR_MS = 3_600_000;

export const PAY_METHODS: Record<PayMethodKey, { label: string; toLabel: string }> = {
  PAYBILL: { label: "M-Pesa Paybill", toLabel: "Paybill number" },
  TILL: { label: "M-Pesa Till (Buy Goods)", toLabel: "Till number" },
  SEND_MONEY: { label: "M-Pesa send money", toLabel: "Phone number" },
  BANK: { label: "Bank transfer", toLabel: "Bank and account number" },
  OTHER: { label: "Something else (cash on the day, a link…)", toLabel: "Details" },
};

export const kes = (n: number): string => `KES ${Math.round(n).toLocaleString("en-KE")}`;

// ---- numbers -------------------------------------------------------------------------------------------------------------------
/** A short code from the event's name, 3–4 capital letters: "Sagalla Heritage Run" -> SHR; "Taita Sound" -> TAI. */
export function prefixFromName(name: string): string {
  const words = (name || "").toUpperCase().replace(/[^A-Z\s]/g, " ").split(/\s+/).filter(Boolean);
  let p = words.length >= 3 ? words.slice(0, 3).map((w) => w[0]).join("") : words.join("").slice(0, 3);
  while (p.length < 3) p += "X";
  return p.slice(0, 4);
}
/** A prefix no other event uses: SAG, then SAG2, SAG3… */
export function uniquePrefix(base: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((t) => t.toUpperCase()));
  if (!used.has(base)) return base;
  for (let i = 2; i < 10_000; i++) { const c = `${base.slice(0, 4)}${i}`; if (!used.has(c)) return c; }
  return `${base}${Date.now() % 100000}`;
}
export const formatNumber = (prefix: string, seq: number): string => `${prefix}-${String(Math.max(0, Math.floor(seq))).padStart(4, "0")}`;

// ---- settings --------------------------------------------------------------------------------------------------------------------
const whole = (v: unknown): number | null => { const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN; return Number.isInteger(n) ? n : null; };
const clean = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");

/** A Safaricom number as 2547… / 2541…, or null. */
export function normalizeSafaricom(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.replace(/[\s\-()]/g, ""); if (s.startsWith("+")) s = s.slice(1);
  if (/^0[71]\d{8}$/.test(s)) s = "254" + s.slice(1); else if (/^[71]\d{8}$/.test(s)) s = "254" + s;
  return /^254[71]\d{8}$/.test(s) ? s : null;
}
/** A contact number for the ticket holder: a Safaricom number is tidied; any other plausible number is accepted as typed. */
export function cleanContactPhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const n = normalizeSafaricom(raw); if (n) return n;
  const digits = raw.replace(/[\s()-]/g, "");
  return /^\+?\d{9,15}$/.test(digits) ? digits : null;
}

export type TicketSettings = {
  ticketing: TicketModeKey; ticketPrice: number; ticketCapacity: number | null; ticketsPerPerson: number; ticketHoldHours: number; ticketsCloseAt: Date | null;
  payMethod: PayMethodKey | null; payTo: string | null; payAccount: string | null; payeeName: string | null; payNotes: string | null;
};

export function validateTicketSettings(input: Record<string, unknown>, eventDate: Date): { ok: true; values: TicketSettings } | { ok: false; error: string } {
  const mode = input.ticketing;
  if (mode !== "OFF" && mode !== "FREE" && mode !== "PAID") return { ok: false, error: "Choose whether this event has no tickets, free tickets or paid tickets." };
  const perPerson = whole(input.ticketsPerPerson ?? 4);
  if (perPerson === null || perPerson < 1 || perPerson > 20) return { ok: false, error: "Tickets per person must be a whole number from 1 to 20." };
  const holdHours = whole(input.ticketHoldHours ?? 48);
  if (holdHours === null || holdHours < 1 || holdHours > 168) return { ok: false, error: "Hold unpaid reservations for between 1 hour and 7 days (168 hours)." };
  let capacity: number | null = null;
  if (input.ticketCapacity !== undefined && input.ticketCapacity !== null && String(input.ticketCapacity).trim() !== "") {
    capacity = whole(input.ticketCapacity);
    if (capacity === null || capacity < 1 || capacity > MAX_CAPACITY) return { ok: false, error: `The number of tickets must be a whole number from 1 to ${MAX_CAPACITY.toLocaleString("en")}, or left empty for no limit.` };
  }
  let closeAt: Date | null = null;
  if (input.ticketsCloseAt instanceof Date) closeAt = input.ticketsCloseAt;
  else if (typeof input.ticketsCloseAt === "string" && input.ticketsCloseAt.trim()) { const d = new Date(input.ticketsCloseAt); if (Number.isNaN(d.getTime())) return { ok: false, error: "That sales-close date isn't a real date." }; closeAt = d; }
  if (closeAt && closeAt.getTime() > eventDate.getTime() + 24 * HOUR_MS) return { ok: false, error: "Ticket sales can't close more than a day after the event starts." };

  const base: TicketSettings = { ticketing: mode, ticketPrice: 0, ticketCapacity: capacity, ticketsPerPerson: perPerson, ticketHoldHours: holdHours, ticketsCloseAt: closeAt, payMethod: null, payTo: null, payAccount: null, payeeName: null, payNotes: null };
  if (mode !== "PAID") return { ok: true, values: base };

  const price = whole(input.ticketPrice);
  if (price === null || price < 1 || price > MAX_PRICE) return { ok: false, error: `The ticket price must be a whole number of shillings from 1 to ${MAX_PRICE.toLocaleString("en")}.` };
  const method = input.payMethod as PayMethodKey;
  if (!method || !(method in PAY_METHODS)) return { ok: false, error: "Choose how guests pay (Paybill, Till, send money, bank or other)." };
  const rawTo = clean(input.payTo, 120);
  let payTo: string | null = rawTo || null;
  if (method === "PAYBILL" || method === "TILL") { if (!/^\d{5,7}$/.test(rawTo.replace(/\s/g, ""))) return { ok: false, error: `${PAY_METHODS[method].toLabel} must be 5 to 7 digits.` }; payTo = rawTo.replace(/\s/g, ""); }
  else if (method === "SEND_MONEY") { const p = normalizeSafaricom(rawTo); if (!p) return { ok: false, error: "The M-Pesa number guests should send to must be a Safaricom number like 0712 345 678." }; payTo = p; }
  else if (rawTo.length < 3) return { ok: false, error: `Fill in the ${PAY_METHODS[method].toLabel.toLowerCase()}.` };
  const payeeName = clean(input.payeeName, 80);
  if (!payeeName) return { ok: false, error: "Enter the name that shows when someone pays (so guests can check they're paying the right person)." };
  const account = clean(input.payAccount, 40);
  if (account && !/^[A-Za-z0-9 _.\-{}/#]+$/.test(account)) return { ok: false, error: "The account can contain letters, numbers, spaces and - _ . / # only, and {TICKET} for the ticket number." };
  return { ok: true, values: { ...base, ticketPrice: price, payMethod: method, payTo, payAccount: account || null, payeeName, payNotes: clean(input.payNotes, 300) || null } };
}

// ---- what a guest is told to do to pay -----------------------------------------------------------------------------------------
export type PaymentEvent = { ticketPrice: number; payMethod: PayMethodKey | null; payTo: string | null; payAccount: string | null; payeeName: string | null; payNotes: string | null };
/** The account to quote: the organiser's template with {TICKET} replaced by the first ticket number, or just the ticket number if none was set. */
export const accountFor = (e: Pick<PaymentEvent, "payAccount">, firstNumber: string): string => (e.payAccount ? e.payAccount.split("{TICKET}").join(firstNumber) : firstNumber);

export function paymentInstructions(e: PaymentEvent, firstNumber: string, quantity: number): { amount: number; account: string; lines: string[] } {
  const amount = e.ticketPrice * Math.max(1, quantity); const account = accountFor(e, firstNumber); const lines: string[] = [];
  switch (e.payMethod) {
    case "PAYBILL": lines.push(`Pay ${kes(amount)} by M-Pesa: Lipa na M-Pesa → Pay Bill → Business number ${e.payTo} → Account number ${account}.`); break;
    case "TILL": lines.push(`Pay ${kes(amount)} by M-Pesa: Lipa na M-Pesa → Buy Goods and Services → Till number ${e.payTo}.`, `Please keep the M-Pesa message: it carries the confirmation code.`); break;
    case "SEND_MONEY": lines.push(`Send ${kes(amount)} by M-Pesa to ${e.payTo}.`); break;
    case "BANK": lines.push(`Pay ${kes(amount)} by bank transfer to ${e.payTo}, using ${account} as the reference.`); break;
    default: lines.push(`Pay ${kes(amount)} as described below.`);
  }
  if (e.payeeName && e.payMethod !== "OTHER") lines.push(`The name that should appear when you pay: ${e.payeeName}.`);
  if (e.payNotes) lines.push(e.payNotes);
  return { amount, account, lines };
}

// ---- who may reserve how many, and until when -----------------------------------------------------------------------------------
export type SalesEvent = { ticketing: TicketModeKey; status?: string; eventDate: Date; ticketsCloseAt: Date | null };
export function salesOpen(e: SalesEvent, now: Date): { open: true } | { open: false; reason: string } {
  if (e.ticketing === "OFF") return { open: false, reason: "Tickets aren't being issued for this event." };
  if (e.status && e.status !== "PUBLISHED") return { open: false, reason: "This event isn't open yet." };
  const closes = e.ticketsCloseAt ?? e.eventDate;
  if (now.getTime() >= closes.getTime()) return { open: false, reason: e.ticketsCloseAt ? "Ticket sales for this event have closed." : "This event has started, so tickets are no longer available." };
  return { open: true };
}

export function validateReservation(input: { quantity: unknown; name: unknown; phone: unknown }, perPerson: number, alreadyHolding: number): { ok: true; quantity: number; name: string; phone: string } | { ok: false; error: string } {
  const quantity = whole(input.quantity);
  if (quantity === null || quantity < 1) return { ok: false, error: "Choose how many tickets you want." };
  const name = clean(input.name, 80);
  if (name.length < 2) return { ok: false, error: "Enter the name the tickets are for." };
  const phone = cleanContactPhone(input.phone);
  if (!phone) return { ok: false, error: "Enter a phone number we can reach you on, like 0712 345 678." };
  const left = perPerson - Math.max(0, alreadyHolding);
  if (quantity > perPerson) return { ok: false, error: `You can get up to ${perPerson} ticket${perPerson === 1 ? "" : "s"} for this event.` };
  if (quantity > left) return { ok: false, error: left <= 0 ? `You already have the most tickets allowed for this event (${perPerson}).` : `You already have ${alreadyHolding}; you can get ${left} more.` };
  return { ok: true, quantity, name, phone };
}

export const holdExpiry = (now: Date, hours: number): Date => new Date(now.getTime() + Math.max(1, hours) * HOUR_MS);
export const claimOk = (c: unknown): c is string => typeof c === "string" && /^[A-Za-z0-9]{6,20}$/.test(c.trim());
export const STATUS_LABEL: Record<TicketStatusKey, string> = { PENDING_PAYMENT: "Waiting for payment", VALID: "Valid", USED: "Used at the door", CANCELLED: "Cancelled", EXPIRED: "Reservation expired" };
export const maskPhone = (p: string): string => (p.length >= 8 ? `${p.slice(0, 4)}••••${p.slice(-4)}` : "••••");
