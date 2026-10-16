// The rules behind the Passport booklet. Pure (no database, no framework), so every one of them can be tested on its own.
// A person's Passport is a booklet: a cover, a page about them, pages of stamps (one set per altitude zone, six to a page), a page of endorsements, a page of rewards.
import { ZONE_BOUNDS } from "@/lib/field-guide";
import type { Locale } from "@/lib/i18n/config";

export type PlaceState = "stamped" | "marked" | "open"; // verified stamp | "I've been here" (no points) | not yet visited
export type VisitMethod = "QR" | "LOCATION" | "SELF_REPORTED";
export type PassportPlace = {
  id: string; slug: string; name: string; region: string; category: string;
  altitudeM: number | null; state: PlaceState; method: VisitMethod | null; visitedAt: string | null; // ISO
  canLocate: boolean; radiusM: number; wanted: boolean;
};
export type Endorsement = { key: string; label: string; description: string; earned: boolean; earnedAt: string | null; progress: { have: number; need: number } | null };
export type Wish = { id: string; name: string; slug: string; region: string; altitudeM: number | null };
export type PassportData = { holder: { name: string; issuedAt: string }; points: number; places: PassportPlace[]; endorsements: Endorsement[]; wishes: Wish[] };

// ----- zones: the Field Guide's own cut-offs. A place with no recorded height is not guessed into a zone; it gets its own page. -----
export type ZoneKey = "plains" | "foothills" | "highlands" | "elsewhere";
export const ZONE_KEYS: readonly ZoneKey[] = ["plains", "foothills", "highlands", "elsewhere"];
export const zoneOf = (m: number | null | undefined): ZoneKey =>
  typeof m !== "number" || !Number.isFinite(m) ? "elsewhere" : m >= ZONE_BOUNDS.highlandsFrom ? "highlands" : m >= ZONE_BOUNDS.foothillsFrom ? "foothills" : "plains";
export const stateOf = (method: string | null | undefined): PlaceState => (method === "QR" || method === "LOCATION" ? "stamped" : method === "SELF_REPORTED" ? "marked" : "open");

// ----- pages -----
export const PER_PAGE = 6;
export type ZonePage = { kind: "zone"; zone: ZoneKey; part: number; of: number; places: PassportPlace[] };
export type PageSpec = { kind: "cover" } | { kind: "you" } | ZonePage | { kind: "seals" } | { kind: "rewards" } | { kind: "end" };
export const pageKey = (p: PageSpec): string => (p.kind === "zone" ? `zone-${p.zone}-${p.part}` : p.kind);

const byClimb = (a: PassportPlace, b: PassportPlace) => (a.altitudeM ?? 0) - (b.altitudeM ?? 0) || a.name.localeCompare(b.name);
/** The stamp pages: each zone's places in the order you climb them, six to a page. A zone with nothing in it has no page. */
export function zonePages(places: PassportPlace[]): ZonePage[] {
  const pages: ZonePage[] = [];
  for (const zone of ZONE_KEYS) {
    const list = places.filter((p) => zoneOf(p.altitudeM) === zone).sort(zone === "elsewhere" ? (a, b) => a.name.localeCompare(b.name) : byClimb);
    const of = Math.ceil(list.length / PER_PAGE);
    for (let i = 0; i < of; i++) pages.push({ kind: "zone", zone, part: i + 1, of, places: list.slice(i * PER_PAGE, (i + 1) * PER_PAGE) });
  }
  return pages;
}
/** Every page after the cover. On a wide screen pages come in pairs (a spread), so a closing page is added if the last page would otherwise be left without a partner. */
export function contentPages(places: PassportPlace[]): PageSpec[] {
  const pages: PageSpec[] = [{ kind: "you" }, ...zonePages(places), { kind: "seals" }, { kind: "rewards" }];
  if ((pages.length - 1) % 2 === 0) pages.push({ kind: "end" });
  return pages;
}
/** The physical sheets of the booklet: the first has the cover on its front and the first page on its back; each later sheet carries two pages; the last carries one (its back is the inside of the back cover). */
export function sheetsOf(content: PageSpec[]): [PageSpec, PageSpec | null][] {
  const sheets: [PageSpec, PageSpec | null][] = [[{ kind: "cover" }, content[0] ?? null]];
  const rest = content.slice(1);
  for (let i = 0; i < rest.length; i += 2) sheets.push([rest[i], rest[i + 1] ?? null]);
  return sheets;
}
/** Which pages are in view at each turn of the booklet: the cover alone, then the back of one sheet beside the front of the next. */
export function spreadsOf(sheets: [PageSpec, PageSpec | null][]): PageSpec[][] {
  return sheets.map((s, i) => (i === 0 ? [s[0]] : [sheets[i - 1][1], s[0]].filter((p): p is PageSpec => p !== null)));
}

// ----- the numbers on the "You" page -----
export function tally(places: PassportPlace[]) {
  return { stamped: places.filter((p) => p.state === "stamped").length, marked: places.filter((p) => p.state === "marked").length, open: places.filter((p) => p.state === "open").length, total: places.length };
}

// ----- text: dates and heights in the person's language, in Nairobi time (where every stamp was made) -----
const TAG: Record<Locale, string> = { en: "en-GB", sw: "sw-KE", fr: "fr-FR", de: "de-DE" };
const NAIROBI = "Africa/Nairobi";
const parts = (iso: string, l: Locale, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(TAG[l], { ...o, timeZone: NAIROBI }).formatToParts(new Date(iso));
/** "12 Sep 2026" */
export const shortDate = (iso: string, l: Locale): string => new Intl.DateTimeFormat(TAG[l], { day: "numeric", month: "short", year: "numeric", timeZone: NAIROBI }).format(new Date(iso)).replace(/\u00A0/g, " ");
/** "12 September 2026" */
export const longDate = (iso: string, l: Locale): string => new Intl.DateTimeFormat(TAG[l], { day: "numeric", month: "long", year: "numeric", timeZone: NAIROBI }).format(new Date(iso));
/** The date as printed on a stamp: "12 SEP 26". */
export function bandDate(iso: string, l: Locale): string {
  const p = parts(iso, l, { day: "numeric", month: "short", year: "2-digit" }); const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("day")} ${get("month").replace(/\./g, "")} ${get("year")}`.toUpperCase();
}
export const metres = (m: number, l: Locale): string => `${new Intl.NumberFormat(TAG[l], { maximumFractionDigits: 0 }).format(m).replace(/\u202F|\u00A0/g, " ")} m`;

/** A place's name as it fits round the top of a stamp: whole words up to 13 characters, upper-case; a single very long word is cut with an ellipsis. */
export function stampLabel(name: string): string {
  const MAX = 13; const words = name.trim().split(/\s+/).filter(Boolean); if (!words.length) return "";
  let out = ""; for (const w of words) { const next = out ? `${out} ${w}` : w; if (next.length > MAX) break; out = next; }
  if (!out) out = `${[...words[0]].slice(0, MAX - 1).join("")}\u2026`;
  return out.toUpperCase();
}
/** How far away a place is, as people say it: "120 m" up to 999 m (nearest 10), then "38.4 km". */
export function distanceText(m: number, l: Locale): string {
  if (!Number.isFinite(m) || m < 0) return "";
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${new Intl.NumberFormat(TAG[l], { maximumFractionDigits: 1 }).format(m / 1000).replace(/\u202F|\u00A0/g, " ")} km`;
}
