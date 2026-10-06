// Short links: the permanent addresses a printed QR code points at (/go/<slug>). Pure rules first, so they're easy to test.
import { isLocalUrl } from "@/lib/checkin-url";

/** 1–30 lowercase letters, digits and hyphens; no leading or trailing hyphen. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/;

export function normaliseSlug(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  return SLUG_PATTERN.test(s) ? s : null;
}

export type DefaultLink = { slug: string; label: string; target: string };

/** Built in, so a printed code keeps working even if the database is down or a row was never created. */
export const DEFAULT_LINKS: DefaultLink[] = [
  { slug: "hills", label: "Discover Taita Hills (shirt back)", target: "/discover" },
  { slug: "passport", label: "Taita Passport", target: "/passport" },
  { slug: "shop", label: "Taita Made shop", target: "/shop" },
  { slug: "stories", label: "Taita Stories", target: "/stories" },
  { slug: "crew", label: "Field Crew", target: "/crew" },
];

const FORBIDDEN_PREFIXES = ["/admin", "/api", "/go"];
// Characters allowed in an internal path + query + fragment.
const PATH_PATTERN = /^\/[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#]*$/;

export type TargetResult = { ok: true; target: string } | { ok: false; error: string };

/**
 * Where a short link may point: a page on this site (starting with /) or a full https:// address. Never http, javascript:, data:,
 * a protocol-relative //host, an address with a password in it, or localhost. (An admin sets these — but a mistake here is printed.)
 */
export function validateTarget(raw: unknown): TargetResult {
  const bad = (error: string): TargetResult => ({ ok: false, error });
  if (typeof raw !== "string") return bad("Enter where the link should go.");
  const t = raw.trim();
  if (!t) return bad("Enter where the link should go.");
  if (t.length > 300) return bad("That address is too long (300 characters at most).");
  if (/[\s\u0000-\u001f\u007f\\]/.test(t)) return bad("The address can't contain spaces or special characters.");
  if (t.startsWith("/")) {
    if (t.startsWith("//")) return bad("Use a page on this site such as /discover, or a full https:// address.");
    if (!PATH_PATTERN.test(t)) return bad("That page address has characters that aren't allowed.");
    const path = t.split(/[?#]/)[0];
    if (path.split("/").some((seg) => seg === "..")) return bad("A page address can't contain '..'.");
    if (FORBIDDEN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return bad("A short link can't point at the admin, the API, or another short link.");
    return { ok: true, target: t };
  }
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return bad("Use a page on this site such as /discover, or a full https:// address.");
  }
  if (u.protocol !== "https:") return bad("External addresses must start with https://.");
  if (u.username || u.password) return bad("The address can't contain a username or password.");
  if (!u.hostname.includes(".") || isLocalUrl(u.origin) || /^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname)) return bad("That isn't a public web address.");
  return { ok: true, target: u.href };
}

/** Link-preview and crawler visits shouldn't count as someone scanning a shirt. */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // a real phone browser always identifies itself
  return /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|slack|discord|preview|embedly|curl|wget|python-requests|headless/i.test(userAgent);
}

export const shortUrl = (base: string, slug: string) => `${base.replace(/\/+$/, "")}/go/${slug}`;

export type Readiness = { ok: true; base: string } | { ok: false; reason: string };

/** Whether a QR code made now would still work in the shop's lifetime. A shirt can't be recalled, so this is strict. */
export function qrReadiness(base: string | null): Readiness {
  if (!base) return { ok: false, reason: "No public site address is set. Set NEXT_PUBLIC_APP_URL to your real domain first." };
  let u: URL;
  try {
    u = new URL(base);
  } catch {
    return { ok: false, reason: "The site address isn't valid. Set NEXT_PUBLIC_APP_URL to your real domain." };
  }
  if (isLocalUrl(u.origin)) return { ok: false, reason: `The site address is ${u.origin}, which a visitor's phone can't reach. Set NEXT_PUBLIC_APP_URL to your real domain.` };
  if (/\.(example|invalid|test|localhost)$/i.test(u.hostname) || /(^|\.)example\.(com|org|net)$/i.test(u.hostname)) return { ok: false, reason: `${u.hostname} is a placeholder domain. Set NEXT_PUBLIC_APP_URL to your real domain before printing anything.` };
  if (u.protocol !== "https:") return { ok: false, reason: "The site address must start with https:// before anything is printed." };
  return { ok: true, base: u.origin };
}

type Db = { shortLink: { findUnique: (a: any) => Promise<any>; upsert: (a: any) => Promise<any>; update: (a: any) => Promise<any> }; shortLinkDay: { upsert: (a: any) => Promise<any> }; $transaction: (ops: any[]) => Promise<any> };
export type ResolvedLink = { slug: string; label: string; target: string; row: { id: string } | null };

/** The link to follow for a slug, or null (unknown, switched off, or its saved address is no longer valid). Never throws. */
export async function resolveLink(db: Pick<Db, "shortLink">, rawSlug: unknown): Promise<ResolvedLink | null> {
  const slug = normaliseSlug(rawSlug);
  if (!slug) return null;
  let row: any;
  try {
    row = await db.shortLink.findUnique({ where: { slug } });
  } catch {
    row = undefined; // the database is down: fall back to the built-in links rather than failing a printed shirt
  }
  if (row) {
    if (!row.active || !validateTarget(row.target).ok) return null;
    return { slug, label: row.label, target: row.target, row: { id: row.id } };
  }
  const def = DEFAULT_LINKS.find((d) => d.slug === slug);
  return def ? { ...def, row: null } : null;
}

/** The calendar day in East Africa Time (UTC+3, no daylight saving), as a UTC-midnight Date for a @db.Date column. */
export function eatDay(now: Date): Date {
  const t = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
}

/** Counts one scan: a running total and a per-day count. Nothing about the visitor is stored. */
export async function recordClick(db: Db, link: ResolvedLink, now: Date = new Date()): Promise<void> {
  let id = link.row?.id;
  if (!id) {
    const made = await db.shortLink.upsert({ where: { slug: link.slug }, create: { slug: link.slug, label: link.label, target: link.target }, update: {} });
    id = made.id;
  }
  await db.$transaction([
    db.shortLink.update({ where: { id }, data: { clicks: { increment: 1 }, lastClickedAt: now } }),
    db.shortLinkDay.upsert({ where: { linkId_day: { linkId: id, day: eatDay(now) } }, create: { linkId: id, day: eatDay(now), count: 1 }, update: { count: { increment: 1 } } }),
  ]);
}
