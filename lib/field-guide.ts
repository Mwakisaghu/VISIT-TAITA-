// The Taita Field Guide: the small, repeated facts that make every listing feel like one place — how high it is, how hard, who leads it,
// when it next runs. Pure functions (no database, no clock of their own) so every rule is testable.

// ---- Plains to peaks -----------------------------------------------------------------------------------------------------------
// Taita is defined by the contrast between the Tsavo plains and the hills. These cut-offs are STARTING VALUES: adjust them to match how you
// talk about your own places. The ribbon's scale is the range a marker moves across.
export const ZONE_BOUNDS = { foothillsFrom: 900, highlandsFrom: 1400 } as const;
export const RIBBON_SCALE = { min: 400, max: 2300 } as const;
export const MAX_ALTITUDE_M = 5200; // nothing in Kenya is higher
export type Zone = "PLAINS" | "FOOTHILLS" | "HIGHLANDS";
export const ZONE_LABEL: Record<Zone, string> = { PLAINS: "Plains", FOOTHILLS: "Foothills", HIGHLANDS: "Highlands" };

export const altitudeZone = (m: number): Zone => (m >= ZONE_BOUNDS.highlandsFrom ? "HIGHLANDS" : m >= ZONE_BOUNDS.foothillsFrom ? "FOOTHILLS" : "PLAINS");
export const formatMetres = (m: number): string => `${Math.round(m).toLocaleString("en-KE")} m`;
/** "1,420 m · Highlands" */
export const altitudeLabel = (m: number): string => `${formatMetres(m)} · ${ZONE_LABEL[altitudeZone(m)]}`;
/** Where a marker sits along the ribbon, 0 (the plains end) to 1 (the highest end), clamped. */
export const ribbonPosition = (m: number): number => Math.min(1, Math.max(0, (m - RIBBON_SCALE.min) / (RIBBON_SCALE.max - RIBBON_SCALE.min)));

// ---- How hard ------------------------------------------------------------------------------------------------------------------
export type Level = "EASY" | "MODERATE" | "HARD";
export const LEVELS: Level[] = ["EASY", "MODERATE", "HARD"];
export const LEVEL_LABEL: Record<Level, string> = { EASY: "Easy", MODERATE: "Moderate", HARD: "Hard" };
export const climbLabel = (m: number): string => `+${Math.round(m).toLocaleString("en-KE")} m`;

// ---- Moods (how a stay feels) ---------------------------------------------------------------------------------------------------
export const MOODS = [
  { key: "quiet", label: "Quiet" }, { key: "view", label: "With a view" }, { key: "family", label: "Family-friendly" },
  { key: "hikers-base", label: "A hiker's base" }, { key: "market", label: "Near a market" },
] as const;
export const MOOD_KEYS: string[] = MOODS.map((m) => m.key);

// ---- A named person ------------------------------------------------------------------------------------------------------------
export const initials = (name: string): string => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

// ---- Dates ---------------------------------------------------------------------------------------------------------------------
const EAT_MS = 3 * 3_600_000; // East Africa Time, UTC+3, no daylight saving
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const eatShort = (d: Date): string => { const e = new Date(d.getTime() + EAT_MS); return `${DOW[e.getUTCDay()]} ${e.getUTCDate()} ${MON[e.getUTCMonth()]}`; };

export type SessionLite = { startsAt: Date; capacity: number; seatsTaken: number; status: string };
export const spotsLeft = (s: Pick<SessionLite, "capacity" | "seatsTaken">): number => Math.max(0, Math.floor(s.capacity) - Math.floor(s.seatsTaken));
export type Chip = { label: string; state: "open" | "few" | "full" };

/** One date chip: "Sat 14 Oct · 6 spots", "Sun 15 Oct · 2 spots left", "Sat 21 Oct · Full". Null if the session isn't open or has started. */
export function sessionChip(s: SessionLite, now: Date): Chip | null {
  if (s.status !== "OPEN" || s.startsAt.getTime() <= now.getTime()) return null;
  const left = spotsLeft(s); const day = eatShort(s.startsAt);
  if (left === 0) return { label: `${day} · Full`, state: "full" };
  if (left <= 2) return { label: `${day} · ${left} ${left === 1 ? "spot" : "spots"} left`, state: "few" };
  return { label: `${day} · ${left} spots`, state: "open" };
}
/** The next few dates, soonest first (open and still to come only). */
export const nextChips = (sessions: SessionLite[], now: Date, take = 3): Chip[] =>
  [...sessions].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()).map((s) => sessionChip(s, now)).filter((c): c is Chip => !!c).slice(0, take);

/** "This weekend": the coming Saturday and Sunday in Nairobi time (or the current ones, if it is already the weekend). [from, to) in UTC. */
export function weekendWindow(now: Date): { from: Date; to: Date } {
  const e = new Date(now.getTime() + EAT_MS); const dow = e.getUTCDay();
  const toSat = dow === 6 ? 0 : dow === 0 ? -1 : 6 - dow;
  const satMidnightEat = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate() + toSat);
  const from = new Date(satMidnightEat - EAT_MS);
  return { from, to: new Date(from.getTime() + 2 * 86_400_000) };
}

// ---- Filters on the experiences list -------------------------------------------------------------------------------------------
export const EXPERIENCE_TYPES = { wildlife: "WILDLIFE", culture: "CULTURE", adventure: "ADVENTURE", food: "FOOD", wellness: "WELLNESS" } as const;
export type ExperienceFilters = { type: (typeof EXPERIENCE_TYPES)[keyof typeof EXPERIENCE_TYPES] | null; level: Level | null; weekend: boolean };
const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";
export function parseExperienceFilters(sp: Record<string, string | string[] | undefined>): ExperienceFilters {
  const t = one(sp.type).toLowerCase(); const l = one(sp.level).toUpperCase();
  return { type: (EXPERIENCE_TYPES as Record<string, ExperienceFilters["type"]>)[t] ?? null, level: (LEVELS as string[]).includes(l) ? (l as Level) : null, weekend: one(sp.when) === "weekend" };
}
/** The address of the list with one filter changed. Choosing the filter that is already on turns it off. */
export function filterHref(f: ExperienceFilters, change: Partial<{ type: string | null; level: string | null; weekend: boolean }>): string {
  const typeKey = (v: ExperienceFilters["type"]) => (v ? v.toLowerCase() : null);
  const next = { type: typeKey(f.type), level: f.level ? f.level.toLowerCase() : null, weekend: f.weekend, ...change };
  if ("type" in change && change.type === typeKey(f.type)) next.type = null;
  if ("level" in change && change.level === (f.level ? f.level.toLowerCase() : null)) next.level = null;
  if ("weekend" in change && change.weekend === f.weekend) next.weekend = false;
  const q = new URLSearchParams();
  if (next.type) q.set("type", next.type); if (next.level) q.set("level", next.level); if (next.weekend) q.set("when", "weekend");
  const s = q.toString(); return s ? `/experiences?${s}` : "/experiences";
}

// ---- Entering the facts (admin and partner forms) -------------------------------------------------------------------------------
type FormLike = { get(name: string): unknown; getAll(name: string): unknown[] };
export type GuideKind = "experience" | "stay" | "place";
export type GuideValues = { altitudeM: number | null; difficulty?: Level | null; elevationGainM?: number | null; hostName?: string | null; hostRole?: string | null; hostQuote?: string | null; moods?: string[] };
const text = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
const wholeOrNull = (v: unknown, min: number, max: number, what: string): { ok: true; n: number | null } | { ok: false; error: string } => {
  const s = typeof v === "string" ? v.trim() : ""; if (s === "") return { ok: true, n: null };
  // Plain digits, optionally with proper thousands commas ("1,420"). Not "1e3", "0x10", "+5" or "1,4,2".
  const n = /^(\d+|\d{1,3}(,\d{3})+)$/.test(s) ? Number(s.replace(/,/g, "")) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) return { ok: false, error: `${what} must be a whole number of metres between ${min.toLocaleString("en")} and ${max.toLocaleString("en")} (or left empty).` };
  return { ok: true, n };
};

export function parseGuideFields(form: FormLike, kind: GuideKind): { ok: true; values: GuideValues } | { ok: false; error: string } {
  const alt = wholeOrNull(form.get("altitudeM"), 0, MAX_ALTITUDE_M, "Altitude"); if (!alt.ok) return alt;
  const values: GuideValues = { altitudeM: alt.n };
  if (kind === "place") return { ok: true, values };
  const hostName = text(form.get("hostName"), 80), hostRole = text(form.get("hostRole"), 40), hostQuote = text(form.get("hostQuote"), 240);
  if (hostName && hostName.length < 2) return { ok: false, error: "The guide or host's name must be at least 2 letters." };
  if (!hostName && (hostRole || hostQuote)) return { ok: false, error: "Add the guide or host's name too: a role or a quote needs a person." };
  values.hostName = hostName || null; values.hostRole = hostRole || null; values.hostQuote = hostQuote || null;
  if (kind === "experience") {
    const climb = wholeOrNull(form.get("elevationGainM"), 0, 5000, "The climb"); if (!climb.ok) return climb;
    const d = text(form.get("difficulty"), 12).toUpperCase();
    if (d && !(LEVELS as string[]).includes(d)) return { ok: false, error: "Difficulty must be easy, moderate or hard." };
    values.elevationGainM = climb.n; values.difficulty = (d as Level) || null;
  } else {
    values.moods = [...new Set(form.getAll("moods").map((m) => text(m, 20)).filter((m) => MOOD_KEYS.includes(m)))];
  }
  return { ok: true, values };
}
