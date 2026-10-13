import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { de } from "@/lib/i18n/messages/de";
import { fr } from "@/lib/i18n/messages/fr";
import { sw } from "@/lib/i18n/messages/sw";

// The English text IS the key: a missing translation simply shows the English, so the site never breaks or shows a code.
// Variables are written {name} and filled in; an unknown variable is left as it is.
export const DICTIONARIES: Record<Exclude<Locale, "en">, Record<string, string>> = { sw, fr, de };
export function fill(text: string, vars?: Record<string, string | number>): string {
  return vars ? text.replace(/\{([A-Za-z0-9_]+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m)) : text;
}
/** The text in a language. English (or anything we have no translation for) comes back as written. */
export function trFor(locale: Locale, text: string, vars?: Record<string, string | number>): string {
  const dict = locale === DEFAULT_LOCALE ? undefined : DICTIONARIES[locale as Exclude<Locale, "en">];
  const found = dict && Object.prototype.hasOwnProperty.call(dict, text) ? dict[text] : undefined;
  return fill(found !== undefined && found !== "" ? found : text, vars);
}
