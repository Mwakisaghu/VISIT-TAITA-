// A picture's credit: who took it, under what licence, and where it came from, written on ONE line as  "Name | Licence | https://source"  (the licence and the link are optional;
// "Name | https://source" also works). Pure functions, so the admin form, the pages and the tests all read a credit the same way.
import { safeHttpUrl } from "@/lib/url";

export type PhotoCredit = { name: string; license: string | null; licenseUrl: string | null; sourceUrl: string | null };
export const CREDIT_MAX = 240;
/** Licences the site knows the address of, so a credit can link to the terms. Any other licence is shown as plain text. */
export const LICENSES: Record<string, string> = {
  "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/", "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/", "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0/", "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/", "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "CC0": "https://creativecommons.org/publicdomain/zero/1.0/", "Unsplash License": "https://unsplash.com/license", "Pexels License": "https://www.pexels.com/license/",
};
const isLink = (s: string) => /^https?:\/\//i.test(s);

/** Reads a credit line. Nothing, or no name, means no credit (null). A link that is not a real http(s) address is dropped, never shown. */
export function parsePhotoCredit(text: unknown): PhotoCredit | null {
  if (typeof text !== "string") return null;
  const parts = text.replace(/\r?\n/g, " ").split("|").map((p) => p.trim()).filter((p, i) => i === 0 || p !== "");
  const name = parts[0]; if (!name || isLink(name)) return null;
  let license: string | null = null, link: string | null = null;
  for (const p of parts.slice(1)) { if (isLink(p)) link = link ?? p; else license = license ?? p; }
  return { name, license, licenseUrl: license ? LICENSES[license.replace(/\s+/g, " ")] ?? null : null, sourceUrl: link ? safeHttpUrl(link) : null };
}

/** For the admin form: tidy a credit line, or say what is wrong. Empty is fine (no credit). */
export function normalizePhotoCredit(text: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  const raw = typeof text === "string" ? text.replace(/\r?\n/g, " ").trim() : "";
  if (raw === "") return { ok: true, value: null };
  if (raw.length > CREDIT_MAX) return { ok: false, error: `Keep the photo credit to ${CREDIT_MAX} characters or fewer.` };
  const parts = raw.split("|").map((p) => p.trim());
  if (!parts[0] || isLink(parts[0])) return { ok: false, error: "The photo credit must start with the photographer's name, for example: Jane Doe | CC BY 4.0 | https://link-to-the-photo" };
  if (parts.length > 3) return { ok: false, error: "Use at most three parts: Name | Licence | https://link" };
  for (const p of parts.slice(1)) {
    if (p === "") return { ok: false, error: "A part of the photo credit is empty: remove the extra bar, or fill it in." };
    if (!isLink(p) && /^(?:[a-z][a-z0-9+.\-]*:\/\/|javascript:|data:|vbscript:|file:|mailto:|tel:|https?:)/i.test(p)) return { ok: false, error: "A link must start with https://" }; // an address that is not a web address (ftp://, javascript: ...) is refused, but a licence such as "CC0: public domain" is fine
    if (isLink(p) && safeHttpUrl(p) === null) return { ok: false, error: "That link is not a valid web address." };
    if (!isLink(p) && p.length > 40) return { ok: false, error: "The licence is too long: use its short name, for example CC BY 4.0." };
  }
  if (parts.filter((p) => isLink(p)).length > 1 || parts.slice(1).filter((p) => !isLink(p)).length > 1) return { ok: false, error: "Use one licence and one link at most." };
  return { ok: true, value: parts.join(" | ") };
}

/** The words shown with a picture: "Photo: Name · Licence". */
export const creditLabel = (c: PhotoCredit): string => `Photo: ${c.name}${c.license ? ` · ${c.license}` : ""}`;
