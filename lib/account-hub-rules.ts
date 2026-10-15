// The rules behind the account page. Pure (no database, no framework), so every one of them can be tested on its own.
import { RIBBON_SCALE, ZONE_BOUNDS, altitudeZone, type Zone } from "@/lib/field-guide";
import { isRedeemable } from "@/lib/rewards";
import { STAFF_ROLES } from "@/lib/session-limits";
import type { Locale } from "@/lib/i18n/config";

// ----- the altitude ribbon: a person's stamps, placed on Taita's own scale (the same 400 to 2,300 m scale and 900 m / 1,400 m zones as the Field Guide) -----
export const RIBBON_WIDTH = 400;
const SPAN = RIBBON_SCALE.max - RIBBON_SCALE.min;
export const ribbonX = (metres: number): number => Math.round(Math.min(1, Math.max(0, (metres - RIBBON_SCALE.min) / SPAN)) * RIBBON_WIDTH * 10) / 10;
export const RIBBON_CUTS = { foothills: ribbonX(ZONE_BOUNDS.foothillsFrom), highlands: ribbonX(ZONE_BOUNDS.highlandsFrom) } as const;
/** The middle of each zone, where its name is written. */
export const ZONE_CENTRES: Record<Zone, number> = {
  PLAINS: ribbonX((RIBBON_SCALE.min + ZONE_BOUNDS.foothillsFrom) / 2),
  FOOTHILLS: ribbonX((ZONE_BOUNDS.foothillsFrom + ZONE_BOUNDS.highlandsFrom) / 2),
  HIGHLANDS: ribbonX((ZONE_BOUNDS.highlandsFrom + RIBBON_SCALE.max) / 2),
};
export type Stamp = { id: string; name: string; altitudeM: number | null };
export type Placed = Stamp & { altitudeM: number };
export function ribbonOf(stamps: Stamp[]) {
  const placed = stamps.filter((s): s is Placed => typeof s.altitudeM === "number" && Number.isFinite(s.altitudeM)).sort((a, b) => a.altitudeM - b.altitudeM);
  const lowest = placed[0] ?? null, highest = placed.length ? placed[placed.length - 1] : null;
  return {
    total: stamps.length,
    unplaced: stamps.length - placed.length, // places with no recorded height still count as stamps; they just have no dot
    dots: placed.map((s) => ({ id: s.id, x: ribbonX(s.altitudeM), zone: altitudeZone(s.altitudeM), top: s.id === highest?.id })),
    lowest, highest,
  };
}
/** The wanted place to suggest next: the most recently saved one that has not been stamped. `wishes` come newest first. */
export function nextToStamp<W extends { id: string }>(wishes: W[], stampedIds: Iterable<string>): W | null {
  const done = new Set(stampedIds); return wishes.find((w) => !done.has(w.id)) ?? null;
}

// ----- what is "coming up": the same rules as the My bookings and My tickets pages, so the hub can never disagree with them -----
export const OPEN_BOOKING = ["REQUESTED", "AWAITING_PAYMENT", "CONFIRMED"] as const;
export function bookingBuckets<B extends { status: string; startsAt: Date }>(rows: B[], now: Date) {
  const upcoming = rows.filter((b) => b.startsAt.getTime() > now.getTime() && (OPEN_BOOKING as readonly string[]).includes(b.status)).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return { upcoming, past: rows.length - upcoming.length };
}
export const TICKET_ORDER = ["PENDING_PAYMENT", "VALID", "USED", "EXPIRED", "CANCELLED"] as const;
export type TicketRow = { groupId: string; status: string; event: { id: string; name: string; eventDate: Date } };
export function ticketGroups(rows: TicketRow[], now: Date) {
  const by = new Map<string, TicketRow[]>(); for (const t of rows) by.set(t.groupId, [...(by.get(t.groupId) ?? []), t]);
  const groups = [...by.entries()].map(([id, ts]) => ({
    id, count: ts.length, event: ts[0].event, status: (TICKET_ORDER.find((s) => ts.some((t) => t.status === s)) ?? "CANCELLED") as (typeof TICKET_ORDER)[number],
    valid: ts.filter((t) => t.status === "VALID").length, // tickets that will get someone in
    live: ts.filter((t) => t.status === "VALID" || t.status === "PENDING_PAYMENT").length, // tickets still held for this person (a group can also hold cancelled ones)
  }));
  const upcoming = groups.filter((g) => g.event.eventDate.getTime() > now.getTime() && (g.status === "PENDING_PAYMENT" || g.status === "VALID")).sort((a, b) => a.event.eventDate.getTime() - b.event.eventDate.getTime());
  return { groups, upcoming, valid: upcoming.reduce((n, g) => n + g.valid, 0) }; // counts tickets one by one, so a group that also holds a cancelled ticket is not overcounted
}
export type OrderState = "awaiting_payment" | "payment_failed" | "paid" | "preparing" | "done" | "cancelled";
export function orderState(o: { status: string; paymentStatus: string }): OrderState {
  if (o.status === "CANCELLED") return "cancelled";
  if (o.status === "FULFILLED") return "done";
  if (o.paymentStatus === "FAILED") return "payment_failed";
  if (o.paymentStatus === "PAID") return o.status === "CONFIRMED" ? "preparing" : "paid";
  return "awaiting_payment";
}
export const isOpenOrder = (o: { status: string }) => o.status === "PENDING" || o.status === "CONFIRMED";
export const enquiryWaiting = (e: { status: string }) => e.status === "NEW";
/** Rewards a person could claim right now: published, in stock, in date, and within their points. */
export function rewardsReady(rewards: { status: string; stock: number | null; validUntil: Date | null; pointsCost: number }[], points: number, now: Date) {
  return rewards.filter((r) => isRedeemable(r, now) && r.pointsCost <= points).length;
}

// ----- greeting and dates -----
export const isNewMember = (createdAt: Date, now: Date) => now.getTime() - createdAt.getTime() < 36 * 3600 * 1000;
const TAG: Record<Locale, string> = { en: "en-GB", sw: "sw-KE", fr: "fr-FR", de: "de-DE" };
const NAIROBI = "Africa/Nairobi";
/** "Saturday 17 October" in the person's language, in Nairobi time (where every booking and event is). */
export const formatDay = (d: Date, l: Locale) => new Intl.DateTimeFormat(TAG[l], { weekday: "long", day: "numeric", month: "long", timeZone: NAIROBI }).format(d);
export const formatDayTime = (d: Date, l: Locale) => `${formatDay(d, l)}, ${new Intl.DateTimeFormat(TAG[l], { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: NAIROBI }).format(d)}`;
/** "3 September 2026" */
export const formatLong = (d: Date, l: Locale) => new Intl.DateTimeFormat(TAG[l], { day: "numeric", month: "long", year: "numeric", timeZone: NAIROBI }).format(d);

// ----- who sees which "Your work" band -----
export type WorkKind = "host" | "seller" | "events" | "creator" | "admin";
export function workKinds(role: string, ownsListings: boolean): WorkKind[] {
  const kinds: WorkKind[] = [];
  if (role === "PARTNER" || ownsListings) kinds.push("host");
  if (role === "SELLER") kinds.push("seller");
  if (role === "EVENT_MANAGER") kinds.push("events");
  if (role === "CREATOR") kinds.push("creator");
  if ((STAFF_ROLES as readonly string[]).includes(role)) kinds.push("admin");
  return kinds;
}
