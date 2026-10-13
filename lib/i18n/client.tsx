"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, localizePath, type Locale } from "@/lib/i18n/config";
import { trFor } from "@/lib/i18n/translate";

const Ctx = createContext<Locale>(DEFAULT_LOCALE);
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) { return <Ctx.Provider value={locale}>{children}</Ctx.Provider>; }
export const useLocale = (): Locale => useContext(Ctx);
/** Translate and localise addresses inside client components. */
export function useI18n() {
  const locale = useLocale();
  return useMemo(() => ({ locale, tr: (text: string, vars?: Record<string, string | number>) => trFor(locale, text, vars), lp: (href: string) => localizePath(href, locale) }), [locale]);
}
