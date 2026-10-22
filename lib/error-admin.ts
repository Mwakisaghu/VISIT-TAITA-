// The Error log page's rules, as plain functions (so they can be tested without a database or a page): what a request for the list means, how it becomes a database filter, and how times are worded.
export const ERROR_PAGE_SIZE = 25;
export type ErrorStatusFilter = "open" | "resolved" | "ignored" | "all";
export type ErrorQuery = { status: ErrorStatusFilter; source: "" | "browser" | "server"; range: "" | "24h" | "7d" | "30d"; q: string; page: number };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** What the address asks for. Anything unknown, malformed or oversized quietly becomes the default, so an odd link can never break the page. */
export function parseErrorQuery(sp: Record<string, string | string[] | undefined>): ErrorQuery {
  const status = one(sp.status); const source = one(sp.source); const range = one(sp.range);
  const page = Math.floor(Number(one(sp.page)));
  return {
    status: (["open", "resolved", "ignored", "all"] as const).find((x) => x === status) ?? "open",
    source: (["browser", "server"] as const).find((x) => x === source) ?? "",
    range: (["24h", "7d", "30d"] as const).find((x) => x === range) ?? "",
    q: one(sp.q).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 100),
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, 10000) : 1,
  };
}

const HOURS = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 } as const;
/** The database filter for a request. A search matches the message, the page, the kind, OR a Reference code (the short code a visitor is shown on the error page) exactly. */
export function buildErrorWhere(q: ErrorQuery, now: Date = new Date()) {
  const and: Record<string, unknown>[] = [];
  if (q.status !== "all") and.push({ status: q.status.toUpperCase() });
  if (q.source) and.push({ source: q.source.toUpperCase() });
  if (q.range) and.push({ lastSeen: { gte: new Date(now.getTime() - HOURS[q.range] * 3600_000) } });
  if (q.q) and.push({ OR: [{ message: { contains: q.q, mode: "insensitive" } }, { route: { contains: q.q, mode: "insensitive" } }, { kind: { contains: q.q, mode: "insensitive" } }, { lastDigest: q.q }, { events: { some: { digest: q.q } } }] });
  return and.length ? { AND: and } : {};
}

/** The address for a list view, leaving out whatever is the default (so the links stay short and a bookmark is clean). */
export function errorListHref(q: Partial<ErrorQuery>): string {
  const p = new URLSearchParams();
  if (q.status && q.status !== "open") p.set("status", q.status);
  if (q.source) p.set("source", q.source); if (q.range) p.set("range", q.range); if (q.q) p.set("q", q.q); if (q.page && q.page > 1) p.set("page", String(q.page));
  const s = p.toString(); return s ? `/admin/errors?${s}` : "/admin/errors";
}

/** "3 minutes ago", "5 hours ago", "2 days ago", and a date after a month. */
export function ago(date: Date, now: Date = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (s < 45) return "just now"; const m = Math.round(s / 60); if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`; const d = Math.round(h / 24); if (d < 31) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" }).format(date);
}
/** A time in Nairobi, for the occurrences table. */
export const nairobiTime = (d: Date): string => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Africa/Nairobi" }).format(d);
