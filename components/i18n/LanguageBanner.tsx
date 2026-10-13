"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CHOICE_KEY, LOCALE_COOKIE, LOCALE_INFO, isLocalisable, offerFor, splitLocale, switchPath, type Locale } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/client";
import { trFor } from "@/lib/i18n/translate";

const SIX_MONTHS = 180 * 86_400_000;
/** Where "Continue in …" sends the browser (a seam, so tests can see the destination without leaving the page). */
export const bannerNav = { to: (url: string) => { window.location.assign(url); } };
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode: it may be asked again next time */ } };

/**
 * A quiet offer, never a switch: if the browser lists a language we have (Kiswahili, Français or Deutsch) before English, ask once whether to continue in it, in that language.
 * Not a pop-up, nothing is hidden behind it, "No thanks" is remembered for six months, and nothing happens without a click. Search engines (no browser language) never see it.
 */
export default function LanguageBanner() {
  const locale = useLocale(); const pathname = usePathname() || "/"; const [offer, setOffer] = useState<Locale | null>(null); const region = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const { rest } = splitLocale(pathname); if (!isLocalisable(rest)) return setOffer(null);
    const chosenBefore = document.cookie.split(";").some((c) => c.trim().startsWith(LOCALE_COOKIE + "="));
    const declined = (() => { const n = Number(read(CHOICE_KEY)); return Number.isFinite(n) && n > 0 && Date.now() - n < SIX_MONTHS; })();
    if (chosenBefore || declined) return setOffer(null);
    setOffer(offerFor(navigator.languages?.length ? navigator.languages : [navigator.language], locale));
  }, [locale, pathname]);
  if (!offer) return null;
  const say = (text: string, vars?: Record<string, string>) => trFor(offer, text, vars); const language = LOCALE_INFO[offer].native;
  const accept = () => { write(CHOICE_KEY, String(Date.now())); bannerNav.to(switchPath(splitLocale(window.location.pathname).rest + window.location.search + window.location.hash, offer)); };
  const decline = () => { write(CHOICE_KEY, String(Date.now())); setOffer(null); };
  return (
    <div ref={region} role="region" aria-label={say("Language")} lang={LOCALE_INFO[offer].htmlLang} className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-[3px] bg-stone p-4 text-parchment shadow-2xl print:hidden sm:bottom-5">
      <p className="font-body text-sm font-semibold">{say("Would you like to continue in {language}?", { language })}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={accept} className="focus-ring inline-flex min-h-[44px] items-center rounded-[2px] bg-rust px-5 font-body text-[0.75rem] font-bold uppercase tracking-[0.14em] text-parchment hover:bg-rust-deep">{say("Continue in {language}", { language })}</button>
        <button type="button" onClick={decline} className="focus-ring inline-flex min-h-[44px] items-center rounded-[2px] border border-parchment/40 px-5 font-body text-[0.75rem] font-bold uppercase tracking-[0.14em] text-parchment hover:bg-parchment hover:text-stone">{say("No thanks")}</button>
      </div>
    </div>
  );
}
