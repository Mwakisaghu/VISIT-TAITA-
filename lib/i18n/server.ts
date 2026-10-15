import { headers, type UnsafeUnwrappedHeaders } from "next/headers";
import { LOCALE_HEADER, asLocale, localizePath, type Locale } from "@/lib/i18n/config";
import { trFor } from "@/lib/i18n/translate";

/** The language of the page being built (from the middleware). Outside a request (tests, build) it is English. */
export function getLocale(): Locale {
  try { return asLocale((headers() as unknown as UnsafeUnwrappedHeaders).get(LOCALE_HEADER)); } catch { return "en"; }
}
/** Translate a piece of text into the page's language. */
export const tr = (text: string, vars?: Record<string, string | number>): string => trFor(getLocale(), text, vars);
/** An address inside the site, in the page's language. */
export const lp = (href: string): string => localizePath(href, getLocale());
