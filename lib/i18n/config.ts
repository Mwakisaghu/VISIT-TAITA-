// Languages: English (the original), Kiswahili, Français, Deutsch. Pure functions: no browser, no framework.
// Each language has its OWN address (/sw/stay, /fr/stay, /de/stay; English has none): that is what search engines and shared links need.
export const LOCALES = ["en", "sw", "fr", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "taita-lang";        // the language this browser last chose
export const LOCALE_HEADER = "x-taita-locale";    // set by the middleware for the page being rendered
export const CHOICE_KEY = "taita-lang-choice";    // "no thanks" to the language offer, remembered in the browser

/** Each language written in itself (never as a flag): the name people recognise. */
export const LOCALE_INFO: Record<Locale, { native: string; english: string; htmlLang: string; hreflang: string }> = {
  en: { native: "English", english: "English", htmlLang: "en", hreflang: "en" },
  sw: { native: "Kiswahili", english: "Swahili", htmlLang: "sw", hreflang: "sw" },
  fr: { native: "Français", english: "French", htmlLang: "fr", hreflang: "fr" },
  de: { native: "Deutsch", english: "German", htmlLang: "de", hreflang: "de" },
};
export const isLocale = (x: unknown): x is Locale => typeof x === "string" && (LOCALES as readonly string[]).includes(x);
export const asLocale = (x: unknown): Locale => (isLocale(x) ? x : DEFAULT_LOCALE);

// ---- Which addresses get a language prefix --------------------------------------------------------------------------------------------
// Never the API, the admin and partner areas (English only), static files and images, or anything with a file extension.
export const UNLOCALISED = ["/api", "/_next", "/admin", "/partner", "/brand", "/p", "/favicon.ico", "/robots.txt", "/sitemap.xml"];
export function isLocalisable(path: unknown): boolean {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) return false;
  const p = path.split("?")[0].split("#")[0];
  if (/\.[A-Za-z0-9]{1,6}$/.test(p)) return false;
  return !UNLOCALISED.some((u) => p === u || p.startsWith(u + "/"));
}

/** "/sw/stay?x=1" -> { locale: "sw", rest: "/stay?x=1" }; "/sw" -> rest "/"; no language in front -> locale null. (Only whole segments: "/swahili" is not "/sw".) */
export function splitLocale(path: string): { locale: Locale | null; rest: string } {
  const m = /^\/([a-z]{2})(?=\/|\?|#|$)([\s\S]*)$/.exec(path); if (!m || !isLocale(m[1])) return { locale: null, rest: path };
  const tail = m[2]; return { locale: m[1], rest: tail === "" || tail.startsWith("?") || tail.startsWith("#") ? "/" + tail : tail };
}
/** The same page in another language. Keeps ?query and #section; leaves external addresses and unlocalised areas alone. English has no prefix. */
export function localizePath(href: string, locale: Locale): string {
  if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return href;
  const { rest } = splitLocale(href); if (!isLocalisable(rest)) return href;
  if (locale === DEFAULT_LOCALE) return rest;
  const [pathPart, ...tail] = rest.split(/(?=[?#])/); const base = pathPart === "/" ? "" : pathPart;
  return `/${locale}${base}${tail.join("")}` || `/${locale}`;
}

// ---- Choosing a language to OFFER (never to force) -------------------------------------------------------------------------------------
/** Reads an Accept-Language header, in the person's own order of preference. "sw-KE" counts as Kiswahili; q=0 means "not this one". */
// (A quality value that is present but unreadable makes that entry invalid.)
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  return String(header ?? "").split(",").map((part, i) => { const [tag, ...params] = part.trim().split(";"); const qp = params.find((p) => /^\s*q=/i.test(p)); const q = qp === undefined ? "1" : /^\s*q=([0-9]*\.?[0-9]+)\s*$/i.exec(qp)?.[1]; return { tag: tag.trim().toLowerCase(), q: q === undefined ? NaN : Number(q), i }; })
    .filter((x) => /^[a-z]{2,3}(-[a-z0-9]+)*$/.test(x.tag) && Number.isFinite(x.q) && x.q > 0).sort((a, b) => b.q - a.q || a.i - b.i).map((x) => x.tag);
}
const primary = (tag: string) => tag.split("-")[0];
/** The language to OFFER, if any: the first language the person lists that we support; nothing if that is the language they are already reading. */
export function offerFor(languages: readonly string[] | null | undefined, current: Locale): Locale | null {
  for (const raw of languages ?? []) { const p = primary(String(raw).toLowerCase()); if (isLocale(p)) return p === current ? null : p; }
  return null;
}
/** The best supported language for a header (used for the offer text). English when nothing matches. */
export const negotiate = (header: string | null | undefined): Locale => { for (const t of parseAcceptLanguage(header)) { const p = primary(t); if (isLocale(p)) return p; } return DEFAULT_LOCALE; };

// ---- Search engines ----------------------------------------------------------------------------------------------------------------------
/** hreflang links for one page: every language it REALLY exists in, plus x-default pointing at English. Absolute addresses. */
export function hreflangLinks(path: string, siteUrl: string, available: readonly Locale[]): { hreflang: string; href: string }[] {
  const base = siteUrl.replace(/\/+$/, ""); const rest = splitLocale(path).rest; const set = [...new Set<Locale>([DEFAULT_LOCALE, ...available])];
  const abs = (l: Locale) => base + (localizePath(rest, l) === "/" ? "" : localizePath(rest, l)) || base + "/";
  return [...set.map((l) => ({ hreflang: LOCALE_INFO[l].hreflang, href: abs(l) || base })), { hreflang: "x-default", href: abs(DEFAULT_LOCALE) || base }];
}

/** Where the language switcher sends a person. English goes through an explicit "/en/…" address so that choosing English really clears an earlier choice of another language. */
export function switchPath(rest: string, to: Locale): string {
  const { rest: r } = splitLocale(rest); if (!isLocalisable(r)) return r;
  return to === DEFAULT_LOCALE ? "/en" + (r === "/" ? "" : r) : localizePath(r, to);
}
