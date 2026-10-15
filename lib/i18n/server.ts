import { headers, type UnsafeUnwrappedHeaders } from "next/headers";
import { LOCALE_HEADER, asLocale, localizePath, type Locale } from "@/lib/i18n/config";
import { trFor } from "@/lib/i18n/translate";

/**
 * The language of the page being built (from the middleware). Outside a request (tests, build) it is English.
 * TRANSITIONAL: Next.js 15 makes headers() asynchronous. This one read is deliberately still synchronous (Next 15 allows it, and warns in development) because tr() and lp() are called, without await, from
 * every server component. It is the ONLY such read in the site, and a test fails if another appears. Next.js 16 removes it: before upgrading to 16, resolve the language once per page (await getLocale() at the
 * top of each page and layout) and pass it down. See docs/nextjs-upgrade.md.
 */
export function getLocale(): Locale {
  try { return asLocale((headers() as unknown as UnsafeUnwrappedHeaders).get(LOCALE_HEADER)); } catch { return "en"; }
}
/** Translate a piece of text into the page's language. */
export const tr = (text: string, vars?: Record<string, string | number>): string => trFor(getLocale(), text, vars);
/** An address inside the site, in the page's language. */
export const lp = (href: string): string => localizePath(href, getLocale());
