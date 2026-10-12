import { distanceKm } from "@/lib/explore";

// "Build your Taita day": the rules. Pure functions: no database, no clock of their own. Days are calendar days in Nairobi time (UTC+3).
export const MAX_STOPS = 12, MAX_PLANS = 20, MAX_PARTY = 20, MAX_TITLE = 80, MAX_NOTE = 120;
export type StopKind = "EXPERIENCE" | "EVENT" | "STAY" | "PLACE";
export const KINDS: StopKind[] = ["EXPERIENCE", "EVENT", "STAY", "PLACE"];
export type Stop = { kind: StopKind; refId: string; sessionId?: string | null; startMinutes?: number | null; note?: string | null };
export type StopInfo = { name: string; durationMin?: number | null; latitude?: number | null; longitude?: number | null; price?: number | null; free?: boolean };
export const keyOf = (s: Pick<Stop, "kind" | "refId">) => `${s.kind}:${s.refId}`;

// ---- Days and times (Nairobi time) -----------------------------------------------------------------------------------------------
const EAT_MS = 3 * 3_600_000, DAY_MS = 86_400_000;
const p2 = (n: number) => String(n).padStart(2, "0");
export function isValidDay(day: unknown): day is string {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [y, m, d] = day.split("-").map(Number); const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}
export const dayStart = (day: string): Date => { const [y, m, d] = day.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d) - EAT_MS); };
export const dayBounds = (day: string): { from: Date; to: Date } => { const from = dayStart(day); return { from, to: new Date(from.getTime() + DAY_MS) }; };
export const todayIn = (now: Date): string => { const e = new Date(now.getTime() + EAT_MS); return `${e.getUTCFullYear()}-${p2(e.getUTCMonth() + 1)}-${p2(e.getUTCDate())}`; };
export const addDays = (day: string, n: number): string => { const t = new Date(dayStart(day).getTime() + EAT_MS + n * DAY_MS); return `${t.getUTCFullYear()}-${p2(t.getUTCMonth() + 1)}-${p2(t.getUTCDate())}`; };
/** A day a new plan may be for: today, or up to a year ahead. */
export const isPlannableDay = (day: unknown, now: Date): boolean => isValidDay(day) && day >= todayIn(now) && day <= addDays(todayIn(now), 365);
export const minutesOf = (d: Date): number => { const e = new Date(d.getTime() + EAT_MS); return e.getUTCHours() * 60 + e.getUTCMinutes(); };
export const timeLabel = (m: number): string => `${p2(Math.floor(m / 60))}:${p2(m % 60)}`;
export function parseTime(s: unknown): number | null { const m = typeof s === "string" ? /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s.trim()) : null; return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
export const dayLabel = (day: string): string => { const t = new Date(dayStart(day).getTime() + EAT_MS); return `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][t.getUTCDay()]} ${t.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][t.getUTCMonth()]}`; };

/** "3 hours", "2 hrs", "90 minutes", "1.5 hours", "Half day", "Full day" -> minutes. Anything else is unknown (null). */
export function parseDurationMinutes(text: string | null | undefined): number | null {
  const t = String(text ?? "").toLowerCase().trim(); if (!t) return null;
  if (/^half[- ]?day$/.test(t)) return 240; if (/^(full|whole)[- ]?day$/.test(t)) return 480;
  const m = /^(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)$/.exec(t); if (!m) return null;
  const n = Number(m[1]) * (/^h/.test(m[2]) ? 60 : 1); return n >= 5 && n <= 960 ? Math.round(n) : null;
}

// ---- Order, warnings, totals ----------------------------------------------------------------------------------------------------
/** The stops in the order of the day: timed stops by time, then untimed ones, then the stay (the night). Ties keep the order they were added. */
export function orderStops<T extends Stop>(stops: T[]): T[] {
  const rank = (s: T) => (s.kind === "STAY" ? 2000 : typeof s.startMinutes === "number" ? s.startMinutes : 1500); // 1500 is after any time in the day (the latest is 1439)
  return stops.map((s, i) => ({ s, i })).sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i).map((x) => x.s);
}
/** A rough driving time for a straight-line distance: about 30 km/h on hill roads, plus 5 minutes to park and walk. */
export const travelMinutes = (km: number): number => Math.max(5, Math.round((km / 30) * 60 + 5));
const DEFAULT_STOP_MIN = 60;

export function checkPlan(stops: Stop[], info: Map<string, StopInfo>): { errors: string[]; warnings: string[] } {
  const errors: string[] = [], warnings: string[] = [];
  if (stops.length === 0) errors.push("Add at least one stop.");
  if (stops.length > MAX_STOPS) errors.push(`A day can have at most ${MAX_STOPS} stops.`);
  if (new Set(stops.map(keyOf)).size !== stops.length) errors.push("The same stop is in the plan twice.");
  if (stops.filter((s) => s.kind === "STAY").length > 1) errors.push("A day plan has one stay (where you sleep).");
  const nm = (s: Stop) => info.get(keyOf(s))?.name ?? "A stop";
  const timed = orderStops(stops).filter((s) => s.kind !== "STAY" && typeof s.startMinutes === "number");
  for (let i = 0; i + 1 < timed.length; i++) {
    const a = timed[i], b = timed[i + 1], ia = info.get(keyOf(a)), ib = info.get(keyOf(b));
    const end = (a.startMinutes as number) + (ia?.durationMin ?? DEFAULT_STOP_MIN); const gap = (b.startMinutes as number) - end;
    if (gap < 0) { warnings.push(`${nm(a)} and ${nm(b)} overlap.`); continue; }
    if (ia?.latitude != null && ia?.longitude != null && ib?.latitude != null && ib?.longitude != null) {
      const km = distanceKm({ latitude: ia.latitude, longitude: ia.longitude }, { latitude: ib.latitude, longitude: ib.longitude }); const need = travelMinutes(km);
      if (km >= 1 && gap < need) warnings.push(`${nm(a)} to ${nm(b)} is about ${Math.round(km)} km (roughly ${need} minutes' drive) but you have ${gap} minutes between them.`);
    }
  }
  return { errors, warnings };
}

/** The estimated cost: experiences and event tickets per person, a stay for one night. Stops with no listed price are counted, not guessed. */
export function estimateTotal(stops: Stop[], info: Map<string, StopInfo>, party: number): { total: number; unpriced: number } {
  const n = Number.isInteger(party) && party >= 1 && party <= MAX_PARTY ? party : 1; let total = 0, unpriced = 0;
  for (const s of stops) {
    const i = info.get(keyOf(s)); if (s.kind === "PLACE") continue;
    if (i?.free) continue;
    if (typeof i?.price !== "number" || i.price < 0) { unpriced++; continue; }
    total += s.kind === "STAY" ? i.price : i.price * n;
  }
  return { total, unpriced };
}

// ---- Saving ----------------------------------------------------------------------------------------------------------------------
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
export type PlanInput = { title: string; day: string; partySize: number; stops: Stop[] };
export function validatePlanInput(raw: unknown, now: Date): { ok: true; value: PlanInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "That plan can't be saved." }; const r = raw as Record<string, unknown>;
  if (!isPlannableDay(r.day, now)) return { ok: false, error: "Choose a day from today up to a year ahead." };
  const party = r.partySize; if (!Number.isInteger(party) || (party as number) < 1 || (party as number) > MAX_PARTY) return { ok: false, error: `How many people: a whole number from 1 to ${MAX_PARTY}.` };
  if (!Array.isArray(r.stops)) return { ok: false, error: "That plan can't be saved." };
  if (r.stops.length > MAX_STOPS) return { ok: false, error: `A day can have at most ${MAX_STOPS} stops.` };
  const stops: Stop[] = [];
  for (const x of r.stops) {
    if (!x || typeof x !== "object") return { ok: false, error: "That plan can't be saved." }; const o = x as Record<string, unknown>;
    if (!KINDS.includes(o.kind as StopKind)) return { ok: false, error: "That plan can't be saved." };
    const refId = clean(o.refId, 80); if (!refId || refId.length > 64) return { ok: false, error: "That plan can't be saved." };
    const sid = o.sessionId == null || o.sessionId === "" ? null : clean(o.sessionId, 80); if (sid !== null && (sid.length === 0 || sid.length > 64)) return { ok: false, error: "That plan can't be saved." };
    const sm = o.startMinutes; if (sm != null && !(Number.isInteger(sm) && (sm as number) >= 0 && (sm as number) <= 1439)) return { ok: false, error: "A stop has a time that isn't valid." };
    stops.push({ kind: o.kind as StopKind, refId, sessionId: sid, startMinutes: o.kind === "STAY" ? null : (sm as number | null | undefined) ?? null, note: clean(o.note, MAX_NOTE) || null });
  }
  const c = checkPlan(stops, new Map()); if (c.errors.length) return { ok: false, error: c.errors[0] };
  return { ok: true, value: { title: clean(r.title, MAX_TITLE) || "My Taita day", day: r.day as string, partySize: party as number, stops } };
}

// A share token: 12 lowercase letters and digits from 60 random bits (no look-alike characters), so a link can't be guessed.
const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
export function tokenFrom(bytes: Uint8Array): string {
  if (bytes.length < 8) throw new Error("not enough random bytes");
  let acc = 0, bits = 0, i = 0, out = ""; // read 5 bits at a time, 12 times
  while (out.length < 12) { if (bits < 5) { acc = (acc << 8) | bytes[i++]; bits += 8; } bits -= 5; out += ALPHABET[(acc >> bits) & 31]; acc &= (1 << bits) - 1; }
  return out;
}
export const isToken = (t: unknown): t is string => typeof t === "string" && /^[0-9a-hjkmnp-tv-z]{12}$/.test(t);
