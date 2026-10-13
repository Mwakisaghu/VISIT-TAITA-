import { addDays, dayStart, todayIn } from "@/lib/plan";
import { T } from "@/lib/i18n/mark";

// "Taita Guide": when to offer help, and what to offer. Pure functions: no browser, no clock of their own.
// The rule behind all of it: be useful, be rare, be easy to close.
export const STORAGE_KEY = "taita-concierge";
export type Variant = "plan" | "maker" | "surprise" | "ask";
export const VARIANTS: Variant[] = ["plan", "maker", "surprise", "ask"];

const HOUR = 3_600_000, DAY = 86_400_000;
export const RULES = { minSiteMs: 10_000, engagedMs: 45_000, engagedScroll: 0.35, engagedPages: 2, idleMs: 45_000, dismissedCooldown: 7 * DAY, actedCooldown: 30 * DAY, optOut: 365 * DAY, maxPer30Days: 3, scrollUpRatio: 0.4, scrollUpWindowMs: 700, scrollUpMinDepth: 0.5 } as const;

// ---- Where it never appears -------------------------------------------------------------------------------------------------------
// Pages where someone is in the middle of something (the planner, the cart, signing in), the account and admin areas, and the legal pages.
export const EXCLUDED = ["/plan", "/passport", "/shop/cart", "/shop/checkout", "/checkout", "/login", "/register", "/signup", "/account", "/admin", "/partner", "/privacy", "/terms", "/api"];
export function isExcluded(path: unknown): boolean {
  if (typeof path !== "string" || !path.startsWith("/")) return true; const p = path.split("?")[0].split("#")[0].toLowerCase().replace(/\/+$/, "") || "/";
  return EXCLUDED.some((e) => p === e || p.startsWith(e + "/"));
}

// ---- What the browser remembers (a tiny note, no personal details) ------------------------------------------------------------------
export type Memory = { shownAt: number[]; dismissedAt: number | null; optOutUntil: number | null; actedAt: number | null };
export const EMPTY_MEMORY: Memory = { shownAt: [], dismissedAt: null, optOutUntil: null, actedAt: null };
const ts = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
/** Reads the note defensively: anything unexpected means "we have never shown it". */
export function readMemory(raw: string | null | undefined): Memory {
  try { const o = JSON.parse(raw ?? "null"); if (!o || typeof o !== "object") return EMPTY_MEMORY;
    return { shownAt: Array.isArray(o.shownAt) ? o.shownAt.map(ts).filter((x: number | null): x is number => x !== null).slice(-10) : [], dismissedAt: ts(o.dismissedAt), optOutUntil: ts(o.optOutUntil), actedAt: ts(o.actedAt) };
  } catch { return EMPTY_MEMORY; }
}
export type Event = "shown" | "dismissed" | "optout" | "acted";
export function remember(m: Memory, e: Event, now: number): Memory {
  switch (e) {
    case "shown": return { ...m, shownAt: [...m.shownAt, now].slice(-10) };
    case "dismissed": return { ...m, dismissedAt: now };
    case "optout": return { ...m, optOutUntil: now + RULES.optOut, dismissedAt: now };
    case "acted": return { ...m, actedAt: now };
  }
}
export type Verdict = { ok: boolean; reason: string };
/** Has it been long enough since we last interrupted this person? */
export function cooledDown(m: Memory, now: number): Verdict {
  if (m.optOutUntil !== null && now < m.optOutUntil) return { ok: false, reason: "asked not to be shown again" };
  if (m.dismissedAt !== null && now - m.dismissedAt < RULES.dismissedCooldown) return { ok: false, reason: "dismissed within the last 7 days" };
  if (m.actedAt !== null && now - m.actedAt < RULES.actedCooldown) return { ok: false, reason: "used it within the last 30 days" };
  if (m.shownAt.filter((t) => now - t < 30 * DAY).length >= RULES.maxPer30Days) return { ok: false, reason: "shown 3 times in the last 30 days" };
  return { ok: true, reason: "ok" };
}

// ---- Is this person actually engaged? -----------------------------------------------------------------------------------------------
export type SessionState = { pageViews: number; startedAt: number; maxScroll: number; shown: boolean };
export const engaged = (s: SessionState, now: number): boolean => now - s.startedAt >= RULES.minSiteMs && (s.pageViews >= RULES.engagedPages || (now - s.startedAt >= RULES.engagedMs && s.maxScroll >= RULES.engagedScroll));
export function canShow(i: { path: string; memory: Memory; session: SessionState; now: number }): Verdict {
  if (isExcluded(i.path)) return { ok: false, reason: "not on this page" };
  if (i.session.shown) return { ok: false, reason: "already shown this visit" };
  if (i.now - i.session.startedAt < RULES.minSiteMs) return { ok: false, reason: "too early" };
  if (!engaged(i.session, i.now)) return { ok: false, reason: "not engaged yet" };
  return cooledDown(i.memory, i.now);
}

// ---- The signals that someone is about to leave ------------------------------------------------------------------------------------
/** A pointer that left through the top of the window while moving up: heading for the tabs, the back button or the address bar. */
export const mouseExit = (e: { clientY: number; relatedTarget: unknown }, prevY: number | null): boolean => e.relatedTarget == null && e.clientY <= 0 && (prevY === null || prevY >= e.clientY);
/** On a phone: a quick scroll back up by at least 40% of the screen, from deep in the page. */
export function scrollUp(m: { fromY: number; toY: number; ms: number; maxDepth: number; viewport: number }): boolean {
  const { fromY, toY, ms, maxDepth, viewport } = m; if (![fromY, toY, ms, maxDepth, viewport].every(Number.isFinite) || viewport <= 0) return false;
  return fromY - toY >= viewport * RULES.scrollUpRatio && ms > 0 && ms <= RULES.scrollUpWindowMs && maxDepth >= RULES.scrollUpMinDepth;
}

// ---- What to offer ---------------------------------------------------------------------------------------------------------------
/** The first thing to offer, from where the person is. */
export function pickVariant(path: string, ai: boolean): Variant {
  const p = (path.split("?")[0] || "/").toLowerCase();
  if (p === "/shop" || p.startsWith("/shop/")) return "maker";
  if (p === "/map" || p === "/discover" || p.startsWith("/discover/")) return "surprise";
  if (p === "/stories" || p.startsWith("/stories/") || p === "/") return ai && p !== "/" ? "ask" : "plan";
  return "plan";
}
/** The tabs, with the chosen one first; "Ask" only when it is available. */
export const variantOrder = (first: Variant, ai: boolean): Variant[] => [first, ...VARIANTS.filter((v) => v !== first && (v !== "ask" || ai))].filter((v) => v !== "ask" || ai);

export const COPY: Record<Variant, { tab: string; title: string; body: string }> = {
  plan: { tab: T("Plan my day"), title: T("Before you go: let Taita plan a day for you."), body: T("Tell us how high you want to be. We will line up a hike, a match and somewhere to sleep from what is on.") },
  maker: { tab: T("Meet a maker"), title: T("Take a piece of Taita home."), body: T("Everything in the shop has a person behind it. Start with this month's maker.") },
  surprise: { tab: T("Surprise me"), title: T("Not sure where to start? Let Taita choose."), body: T("One place, picked for you, shown on the map with how high it sits.") },
  ask: { tab: T("Ask Taita"), title: T("Ask the guide."), body: T("Ask about places, stories, stays and events. It reads this site's own pages.") },
};

/** "How high": the idea at the heart of the Field Guide. */
export const ZONE_CHOICES = [
  { zone: "HIGHLANDS", label: T("Highlands"), feel: T("Misty, cool, quiet: cloud forest above 1,400 m.") },
  { zone: "FOOTHILLS", label: T("Foothills"), feel: T("Green terraces and markets, 900 to 1,400 m.") },
  { zone: "PLAINS", label: T("Plains"), feel: T("Big skies and wildlife, below 900 m.") },
] as const;

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const weekdayOf = (day: string): string => WEEKDAY[new Date(dayStart(day).getTime() + 3 * HOUR).getUTCDay()];
/** Up to three days to choose from: tomorrow, the next Saturday and the one after (no repeats). */
export function dayChoices(now: Date): { label: string; day: string }[] {
  const today = todayIn(now); const out: { label: string; day: string }[] = [{ label: T("Tomorrow"), day: addDays(today, 1) }];
  let sat = addDays(today, 1); for (let i = 0; i < 7 && weekdayOf(sat) !== "Saturday"; i++) sat = addDays(sat, 1);
  if (sat !== out[0].day) out.push({ label: T("This Saturday"), day: sat });
  out.push({ label: sat === out[0].day ? T("Next Saturday") : T("The Saturday after"), day: addDays(sat, 7) });
  return out;
}
