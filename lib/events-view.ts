import type { Prisma } from "@prisma/client";
import { weekendWindow } from "@/lib/field-guide";
import { kes, salesOpen, type TicketModeKey } from "@/lib/ticket";

// How events are grouped, filtered and described on the events pages. Pure functions: no database, no clock of their own.
// All dates are read in Nairobi time (UTC+3, no daylight saving), wherever the server happens to be.
const EAT_MS = 3 * 3_600_000, DAY_MS = 86_400_000;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const eat = (d: Date) => new Date(d.getTime() + EAT_MS);

export const eatDayStart = (d: Date): Date => { const e = eat(d); return new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()) - EAT_MS); };
/** The first moment of next month, in Nairobi time. */
export const eatNextMonthStart = (d: Date): Date => { const e = eat(d); return new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth() + 1, 1) - EAT_MS); };
export function eatParts(d: Date): { day: number; weekday: string; month: string; time: string } {
  const e = eat(d); const p = (n: number) => String(n).padStart(2, "0");
  return { day: e.getUTCDate(), weekday: DOW[e.getUTCDay()], month: MON[e.getUTCMonth()], time: `${p(e.getUTCHours())}:${p(e.getUTCMinutes())}` };
}
export const eatDateLabel = (d: Date): string => { const x = eatParts(d); return `${x.weekday} ${x.day} ${x.month}`; };

// ---- Groups ----------------------------------------------------------------------------------------------------------------------
export type Group = "today" | "weekend" | "month" | "later";
export const GROUPS: { key: Group; label: string }[] = [{ key: "today", label: "Today" }, { key: "weekend", label: "This weekend" }, { key: "month", label: "Later this month" }, { key: "later", label: "Later" }];
/** Which group an event belongs to, or "past" if it was before today. An event is in exactly one group (today wins over the weekend, the weekend over the month). */
export function groupOf(date: Date, now: Date): Group | "past" {
  const today = eatDayStart(now).getTime(), t = date.getTime();
  if (t < today) return "past";
  if (t < today + DAY_MS) return "today";
  const w = weekendWindow(now); if (t >= w.from.getTime() && t < w.to.getTime()) return "weekend";
  if (t < eatNextMonthStart(now).getTime()) return "month";
  return "later";
}
export function groupEvents<T extends { eventDate: Date }>(events: T[], now: Date): { key: Group; label: string; items: T[] }[] {
  const sorted = [...events].sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  return GROUPS.map((g) => ({ ...g, items: sorted.filter((e) => groupOf(e.eventDate, now) === g.key) })).filter((g) => g.items.length > 0);
}

// ---- Filters ---------------------------------------------------------------------------------------------------------------------
export const SERIES = { cup: "TAITA_CUP", week: "TAITA_WEEK", sound: "TAITA_SOUND" } as const;
export type Program = (typeof SERIES)[keyof typeof SERIES];
export type EventFilters = { when: "today" | "weekend" | "month" | "past" | null; program: Program | null; free: boolean };
const WHEN = ["today", "weekend", "month", "past"] as const;
const one = (v: string | string[] | undefined): string => ((Array.isArray(v) ? v[0] : v) ?? "").toLowerCase();
export function parseEventFilters(sp: Record<string, string | string[] | undefined>): EventFilters {
  const w = one(sp.when), s = one(sp.series);
  return { when: (WHEN as readonly string[]).includes(w) ? (w as EventFilters["when"]) : null, program: (SERIES as Record<string, Program>)[s] ?? null, free: one(sp.free) === "1" };
}
const seriesKey = (p: Program | null) => (p ? (Object.keys(SERIES) as (keyof typeof SERIES)[]).find((k) => SERIES[k] === p) ?? null : null);
/** The address of the list with one filter changed. Choosing the filter that is already on turns it off. */
export function eventFilterHref(f: EventFilters, change: Partial<{ when: string | null; series: string | null; free: boolean }>): string {
  const cur = { when: f.when as string | null, series: seriesKey(f.program) as string | null, free: f.free };
  const next = { ...cur, ...change };
  if ("when" in change && change.when === cur.when) next.when = null;
  if ("series" in change && change.series === cur.series) next.series = null;
  if ("free" in change && change.free === cur.free) next.free = false;
  const q = new URLSearchParams(); if (next.when) q.set("when", next.when); if (next.series) q.set("series", next.series); if (next.free) q.set("free", "1");
  const s = q.toString(); return s ? `/events?${s}` : "/events";
}
/** The database filter for the list. Without a "when", it is everything from the start of today onwards. */
export function eventWhere(f: EventFilters, now: Date): Prisma.EventWhereInput {
  const today = eatDayStart(now), where: Prisma.EventWhereInput = { status: "PUBLISHED" };
  if (f.when === "past") where.eventDate = { lt: today };
  else if (f.when === "today") where.eventDate = { gte: today, lt: new Date(today.getTime() + DAY_MS) };
  else if (f.when === "weekend") { const w = weekendWindow(now); where.eventDate = { gte: new Date(Math.max(w.from.getTime(), today.getTime())), lt: w.to }; }
  else if (f.when === "month") where.eventDate = { gte: today, lt: eatNextMonthStart(now) };
  else where.eventDate = { gte: today };
  if (f.program) where.program = f.program;
  if (f.free) where.ticketing = "FREE";
  return where;
}

// ---- Tickets, as a visitor should read them --------------------------------------------------------------------------------------
export type TicketState = { kind: "none" | "free" | "paid" | "soldout" | "closed"; label: string | null; cta: string };
type TicketEvent = { ticketing: TicketModeKey; status?: string; eventDate: Date; ticketsCloseAt: Date | null; ticketCapacity: number | null; ticketsTaken: number; ticketPrice: number };
export function ticketState(e: TicketEvent, now: Date): TicketState {
  if (e.ticketing === "OFF") return { kind: "none", label: null, cta: "Details" };
  if (!salesOpen(e, now).open) return { kind: "closed", label: "Sales closed", cta: "Details" };
  const left = e.ticketCapacity === null ? null : Math.max(0, e.ticketCapacity - e.ticketsTaken);
  if (left === 0) return { kind: "soldout", label: "Sold out", cta: "Details" };
  const few = left !== null && left <= 10 ? ` · ${left} left` : "";
  return e.ticketing === "FREE" ? { kind: "free", label: `Free tickets${few}`, cta: "Get a ticket" } : { kind: "paid", label: `${kes(e.ticketPrice)}${few}`, cta: "Get tickets" };
}

// ---- Sharing ---------------------------------------------------------------------------------------------------------------------
/** A WhatsApp "share" link, or null when there is no public web address to share (a link to nowhere is no use). */
export function whatsappHref(text: string, siteUrl: string | undefined, path: string): string | null {
  const base = (siteUrl ?? "").trim().replace(/\/+$/, ""); if (!/^https?:\/\/[^\s/]+/i.test(base)) return null;
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${base}${path}`)}`;
}
