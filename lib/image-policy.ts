import { z } from "zod";
import HOSTS from "@/lib/image-hosts.json";

// Which picture addresses the site accepts. Pure functions: no network, no database.
//   * A LOGO must be the address of a picture file, never of a web page (a page shows as a broken image).
//   * A photo must not be hosted by a site whose pictures we have no right to reuse (review sites, social networks, booking sites, photo agencies).
//   * Placeholder pictures are not accepted for anything real.
//   * Stock photos are accepted but reported, so they can be replaced with real ones (see the audit).
const hostOf = (raw: string): string | null => { try { const u = new URL(raw); return u.protocol === "http:" || u.protocol === "https:" ? u.hostname.toLowerCase() : null; } catch { return null; } };
const matches = (host: string, list: readonly string[]) => list.some((h) => host === h || host.endsWith("." + h));

/** Sites whose pictures belong to someone else: hotlinking them is not permission to use them. (Lists live in lib/image-hosts.json, shared with the audit tool.) */
export const BLOCKED_HOSTS: Record<string, string> = HOSTS.blocked;
/** Placeholder generators: fine for a layout draft, never for a real listing, sponsor or story. */
export const PLACEHOLDER_HOSTS = HOSTS.placeholders as readonly string[];
/** Free stock libraries: allowed (their licences permit it), but not pictures OF Taita, so the audit lists them for replacement. */
export const STOCK_HOSTS = HOSTS.stock as readonly string[];
/** The site's own "a picture is coming soon" image: accepted for photos (it is honest), never for a logo, and reported by the audit as needing a real photo. */
export const OWN_PLACEHOLDER = "/placeholders/taita-placeholder.svg";
const isOwnPlaceholder = (v: string) => v.startsWith(HOSTS.ownPlaceholderPath) && /^\/placeholders\/[a-z0-9-]+\.svg$/.test(v);
const PICTURE_FILE = /\.(png|jpe?g|webp|gif|svg|avif)$/i;

export type ImageKind = "photo" | "logo";
export type ImageVerdict = { ok: true; stock: boolean; placeholder?: boolean } | { ok: false; code: "not-a-url" | "blocked" | "placeholder" | "not-a-picture"; error: string };

export function checkImageUrl(raw: unknown, opts: { kind?: ImageKind; allowRelative?: boolean } = {}): ImageVerdict {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (isOwnPlaceholder(value)) return opts.kind === "logo" ? { ok: false, code: "placeholder", error: "That is the 'picture coming soon' placeholder. A sponsor needs its own logo file." } : { ok: true, stock: false, placeholder: true };
  // One of the site's own files (for example /logos/acme.png): fine to DISPLAY and to audit. The admin forms still ask for a full address.
  if (opts.allowRelative && value.startsWith("/") && !value.startsWith("//") && /^\/[A-Za-z0-9._\-\/]+$/.test(value) && PICTURE_FILE.test(value)) return { ok: true, stock: false };
  const host = hostOf(value);
  if (!host) return { ok: false, code: "not-a-url", error: "Enter the full web address of a picture (starting with https://)." };
  const blocked = Object.entries(BLOCKED_HOSTS).find(([h]) => host === h || host.endsWith("." + h));
  if (blocked) return { ok: false, code: "blocked", error: `That picture is hosted by ${blocked[1]}. Please use a photo you own or have permission to use.` };
  if (matches(host, PLACEHOLDER_HOSTS)) return { ok: false, code: "placeholder", error: "That is a placeholder picture. Please use a real one." };
  const stock = matches(host, STOCK_HOSTS);
  if (opts.kind === "logo") {
    const path = (() => { try { return new URL(value).pathname; } catch { return ""; } })();
    if (!PICTURE_FILE.test(path)) return { ok: false, code: "not-a-picture", error: "That looks like a web page, not a picture. Use the address of the logo file itself (it usually ends in .png, .jpg or .svg)." };
    if (stock) return { ok: false, code: "not-a-picture", error: "A stock photo cannot be a logo. Use the sponsor's own logo file." };
  }
  return { ok: true, stock };
}

const make = (kind: ImageKind) => z.string().trim().superRefine((v, ctx) => { const r = checkImageUrl(v, { kind }); if (!r.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message: r.error }); });
/** For admin forms: a picture address that passes the policy. */
export const imageUrl = make("photo");
export const logoUrl = make("logo");

/** What is wrong (or worth noting) about a picture address already stored. Used by the audit and by the sponsor strip. */
export function imageIssue(raw: unknown, kind: ImageKind = "photo", allowRelative = false): "blocked" | "placeholder" | "not-a-picture" | "not-a-url" | "stock" | "own-placeholder" | null {
  const v = checkImageUrl(raw, { kind, allowRelative }); if (!v.ok) return v.code; return v.placeholder ? "own-placeholder" : v.stock ? "stock" : null;
}
