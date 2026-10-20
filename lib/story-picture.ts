// Which pictures a STORY may show. Stories are editorial: their pictures must be ones the site may really use and credit, so they come from the site's own storage, a free stock library, or an openly
// licensed library (Wikimedia Commons). A picture hotlinked from somebody else's website (a hotel's own site, a search-engine thumbnail) is never shown, whatever the database holds: the card shows
// the site's own "picture coming soon" image instead. (Hosts' own listing pictures follow a different, looser rule: this one is for stories only.)
import HOSTS from "@/lib/image-hosts.json";
import { BLOCKED_HOSTS, OWN_PLACEHOLDER, PLACEHOLDER_HOSTS, STOCK_HOSTS } from "@/lib/image-policy";

export const OPEN_HOSTS = HOSTS.open as readonly string[];
const matches = (host: string, list: readonly string[]) => list.some((h) => host === h || host.endsWith("." + h));
const storageHost = (env: Record<string, string | undefined>): string | null => { try { return new URL(env.S3_PUBLIC_URL || "").hostname.toLowerCase() || null; } catch { return null; } };

/** Is this a picture a story may show? A file of the site's own, or an https picture on the site's storage, a stock library or an open library. */
export function isApprovedStoryPicture(src: unknown, env: Record<string, string | undefined> = process.env): boolean {
  if (typeof src !== "string") return false;
  const s = src.trim(); if (!s) return false;
  if (s.startsWith("/")) return !s.startsWith("//") && !s.startsWith("/\\") && /^\/[A-Za-z0-9._\-\/]+$/.test(s);
  let u: URL; try { u = new URL(s); } catch { return false; }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (Object.keys(BLOCKED_HOSTS).some((h) => host === h || host.endsWith("." + h)) || matches(host, PLACEHOLDER_HOSTS)) return false;
  return host === storageHost(env) || matches(host, STOCK_HOSTS) || matches(host, OPEN_HOSTS);
}
/** The picture to show for a story: the stored one if approved, otherwise the site's own "picture coming soon" image (never a broken or borrowed picture). */
export const storyPicture = (src: unknown, env: Record<string, string | undefined> = process.env): string => (isApprovedStoryPicture(src, env) ? (src as string).trim() : OWN_PLACEHOLDER);
