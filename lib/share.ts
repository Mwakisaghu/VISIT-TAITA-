// Sharing a page: the message, the address and the links. Pure functions.
// The address shared is the page's own (so it keeps its language: a /sw/ page opens in Kiswahili for whoever receives it).
const SITE_SUFFIX = /\s*[|–—-]\s*Visit Taita\s*$/i;
/** The page title without the site name tacked on ("The Man-Eaters of Tsavo | Visit Taita" -> "The Man-Eaters of Tsavo"). */
export function cleanTitle(title: unknown): string {
  const t = (typeof title === "string" ? title : "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().replace(SITE_SUFFIX, "").trim();
  return t.length > 140 ? t.slice(0, 139).trimEnd() + "…" : t;
}
/** The address to share: https only, no #section, no old tracking, and (for a channel) a small tag so you can see where visits came from. Returns null for anything that isn't a web page address. */
export function shareUrl(href: string, opts: { origin?: string | null; channel?: string } = {}): string | null {
  let u: URL; try { u = new URL(href); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (opts.origin) { try { const o = new URL(opts.origin); if (o.protocol === "https:") { u.protocol = o.protocol; u.hostname = o.hostname; u.port = o.port; } } catch { /* keep the current host */ } }
  u.hash = ""; for (const k of [...u.searchParams.keys()]) if (/^utm_/i.test(k)) u.searchParams.delete(k);
  if (opts.channel && /^[a-z0-9-]{1,20}$/.test(opts.channel)) { u.searchParams.set("utm_source", opts.channel); u.searchParams.set("utm_medium", "share"); }
  return u.toString();
}
export const whatsappLink = (message: string, url: string): string => `https://wa.me/?text=${encodeURIComponent(`${message}\n${url}`)}`;
export const facebookLink = (url: string): string => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
