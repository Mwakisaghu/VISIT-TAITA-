import { distanceKm } from "@/lib/explore";
import { altitudeZone, ZONE_LABEL, type Zone } from "@/lib/field-guide";
import { checkPlan, estimateTotal, keyOf, orderStops, type Stop, type StopInfo } from "@/lib/plan";

// Turns "how high do you want to be?" into a day: a hike or two, a match, a place to go and somewhere to sleep, from what is really on that day.
// It uses the planner's own rules (overlaps, drive times), so a suggestion never contradicts the planner it opens in. Deterministic: same input, same day.
export type Catalogue = {
  day: string;
  experiences: { id: string; name: string; region: string; durationMin: number | null; price: number | null; latitude: number | null; longitude: number | null; altitudeM?: number | null; sessions: { id: string; minutes: number; spots: number }[] }[];
  events: { id: string; name: string; region: string; minutes: number; price: number | null; free: boolean }[];
  stays: { id: string; name: string; region: string; price: number | null; latitude: number | null; longitude: number | null; altitudeM?: number | null }[];
  places: { id: string; name: string; region: string; latitude: number | null; longitude: number | null; altitudeM: number | null }[];
};
export type Pref = Zone | "ANY";
export type Item = Stop & { name: string; region: string; info: StopInfo };
export type Suggestion = { items: Item[]; reasons: string[]; total: number; unpriced: number; warnings: string[] };

const ORDER: Zone[] = ["PLAINS", "FOOTHILLS", "HIGHLANDS"];
/** How well something at this height fits the wish: right zone 2, next door 0.75, unknown height 0.4, any wish 1, otherwise 0. */
export function zoneScore(alt: number | null | undefined, pref: Pref): number {
  if (pref === "ANY") return 1; if (typeof alt !== "number" || !Number.isFinite(alt)) return 0.4;
  const d = Math.abs(ORDER.indexOf(altitudeZone(alt)) - ORDER.indexOf(pref)); return d === 0 ? 2 : d === 1 ? 0.75 : 0;
}
const timeScore = (m: number) => (m >= 420 && m <= 690 ? 1 : m >= 720 && m <= 960 ? 0.5 : 0.1);
const rotate = <T,>(a: T[], seed: number): T[] => (a.length === 0 ? a : [...a.slice(((seed % a.length) + a.length) % a.length), ...a.slice(0, ((seed % a.length) + a.length) % a.length)]);
const byScore = <T extends { name: string }>(rows: T[], score: (x: T) => number): T[] => [...rows].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));

export function suggestDay(cat: Catalogue, o: { zone: Pref; party: number; seed?: number; anchorPlaceId?: string | null }): Suggestion {
  const party = Number.isInteger(o.party) && o.party >= 1 ? Math.min(o.party, 20) : 1; const seed = Number.isInteger(o.seed) ? (o.seed as number) : 0;
  const picks: Item[] = []; const reasons: string[] = []; const zoneWord = o.zone === "ANY" ? "your" : ZONE_LABEL[o.zone].toLowerCase();
  const infoOf = (xs: Item[]) => new Map(xs.map((i) => [keyOf(i), i.info]));
  const accept = (it: Item): boolean => { const next = [...picks, it]; const c = checkPlan(next, infoOf(next)); if (c.errors.length || c.warnings.length) return false; picks.push(it); return true; };
  const near = (a: { latitude?: number | null; longitude?: number | null } | undefined, b: { latitude: number | null; longitude: number | null }) => (a && a.latitude != null && a.longitude != null && b.latitude != null && b.longitude != null ? distanceKm({ latitude: a.latitude, longitude: a.longitude }, { latitude: b.latitude, longitude: b.longitude }) : 999);
  const firstCoord = () => picks.map((p) => p.info).find((i) => i.latitude != null && i.longitude != null);

  // A place the person was just reading about comes first.
  let anchored = false;
  if (o.anchorPlaceId) { const p = cat.places.find((x) => x.id === o.anchorPlaceId); if (p) { anchored = accept({ kind: "PLACE", refId: p.id, sessionId: null, startMinutes: null, note: null, name: p.name, region: p.region, info: { name: p.name, latitude: p.latitude, longitude: p.longitude } }); if (anchored) reasons.push(`${p.name}: the place you were reading about.`); } }

  // Up to two experiences, each at a session with room for the party, best fit for the wished height and the morning first.
  const exps = rotate(byScore(cat.experiences.filter((e) => e.sessions.some((s) => s.spots >= party)), (e) => zoneScore(e.altitudeM, o.zone)), seed); let nExp = 0;
  for (const e of exps) {
    if (nExp >= 2) break;
    const sessions = e.sessions.filter((s) => s.spots >= party).sort((a, b) => timeScore(b.minutes) - timeScore(a.minutes) || a.minutes - b.minutes);
    for (const s of sessions) {
      if (accept({ kind: "EXPERIENCE", refId: e.id, sessionId: s.id, startMinutes: s.minutes, note: null, name: e.name, region: e.region, info: { name: e.name, durationMin: e.durationMin, latitude: e.latitude, longitude: e.longitude, price: e.price } })) { nExp++; reasons.push(`${e.name}: ${typeof e.altitudeM === "number" ? `${zoneScore(e.altitudeM, o.zone) >= 2 ? "a " + zoneWord + " pick" : "close to " + zoneWord + " country"}` : "on that day, with room for your group"}.`); break; }
    }
  }
  // One event, if one fits around the rest.
  for (const v of [...cat.events].sort((a, b) => a.minutes - b.minutes)) { if (accept({ kind: "EVENT", refId: v.id, sessionId: null, startMinutes: v.minutes, note: null, name: v.name, region: v.region, info: { name: v.name, price: v.price, free: v.free } })) { reasons.push(`${v.name}: happening that day.`); break; } }
  // One place to go, nearest to the first stop among the best fits for the height.
  if (!anchored) { // (also when the place read about is gone: then a normal choice is made)
    const ranked = rotate(byScore(cat.places, (p) => zoneScore(p.altitudeM, o.zone) - Math.min(near(firstCoord(), p), 100) / 1000), seed); const p = ranked[0];
    if (p) { accept({ kind: "PLACE", refId: p.id, sessionId: null, startMinutes: null, note: null, name: p.name, region: p.region, info: { name: p.name, latitude: p.latitude, longitude: p.longitude } }); reasons.push(`${p.name}: ${typeof p.altitudeM === "number" ? `${p.altitudeM.toLocaleString("en-KE")} m, ${zoneScore(p.altitudeM, o.zone) >= 2 ? "right for " + zoneWord + " country" : "near it"}` : "worth a stop"}.`); }
  }
  // One stay for the night, in the right height and close to where the day ends up.
  const last = [...orderStops(picks)].reverse().map((p) => p.info).find((i) => i.latitude != null && i.longitude != null);
  const stay = rotate(byScore(cat.stays, (s) => zoneScore(s.altitudeM, o.zone) - Math.min(near(last, s), 100) / 1000), seed)[0];
  if (stay) { accept({ kind: "STAY", refId: stay.id, sessionId: null, startMinutes: null, note: null, name: stay.name, region: stay.region, info: { name: stay.name, price: stay.price, latitude: stay.latitude, longitude: stay.longitude } }); reasons.push(`${stay.name}: somewhere to sleep${typeof stay.altitudeM === "number" ? `, ${stay.altitudeM.toLocaleString("en-KE")} m up` : ""}.`); }

  if (picks.length === 0) reasons.push("Nothing is scheduled that day yet. Try another day.");
  const items = orderStops(picks) as Item[]; const info = infoOf(items); const t = estimateTotal(items, info, party); const w = items.length ? checkPlan(items, info).warnings : [];
  return { items, reasons, total: t.total, unpriced: t.unpriced, warnings: w };
}

/** The draft the planner reads from the browser tab, so a suggestion opens ready to edit. The shape is exactly what the planner itself saves. */
export function toDraft(day: string, party: number, items: Item[]) {
  return { day, party, title: "Suggested by Taita Guide", items: items.map((i) => ({ kind: i.kind, refId: i.refId, sessionId: i.sessionId ?? null, startMinutes: i.startMinutes ?? null, note: null, name: i.name, region: i.region, info: i.info })) };
}
