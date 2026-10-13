import { DEFAULT_LOCALE, asLocale, isLocale, isLocalisable, localizePath, splitLocale, type Locale } from "@/lib/i18n/config";

// What to do with a page request, language-wise. Pure, so every case can be tested.
//   /sw/stay      -> show /stay in Kiswahili (an address of its own, so it can be shared and found), and remember the choice
//   /en/stay      -> /stay (English has no prefix), and remember English
//   /stay         -> English, UNLESS this browser chose another language earlier: then go to that language's address
// It NEVER switches language because of the browser's settings or the visitor's location: that is only ever offered (see the banner).
export type Decision =
  | { action: "next"; locale: Locale }
  | { action: "rewrite"; to: string; locale: Locale; remember: Locale }
  | { action: "redirect"; to: string; status: 307 | 308; remember: Locale | null };

export function decide(i: { pathname: string; search?: string; cookie?: string | null; method?: string }): Decision {
  const search = i.search && i.search !== "?" ? i.search : ""; const { locale: inPath, rest } = splitLocale(i.pathname);
  if (inPath === null && !isLocalisable(i.pathname)) return { action: "next", locale: DEFAULT_LOCALE };
  if (inPath !== null && !isLocalisable(rest)) return { action: "next", locale: DEFAULT_LOCALE };
  if (inPath === DEFAULT_LOCALE) return { action: "redirect", to: rest + search, status: 308, remember: DEFAULT_LOCALE };
  if (inPath !== null) return { action: "rewrite", to: rest + search, locale: inPath, remember: inPath };
  const chosen = isLocale(i.cookie) ? i.cookie : DEFAULT_LOCALE; const safe = !i.method || i.method === "GET" || i.method === "HEAD";
  if (chosen !== DEFAULT_LOCALE && safe) return { action: "redirect", to: localizePath(i.pathname, chosen) + search, status: 307, remember: null };
  return { action: "next", locale: asLocale(DEFAULT_LOCALE) };
}
