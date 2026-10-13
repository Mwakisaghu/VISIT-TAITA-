"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_INFO, splitLocale, switchPath } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

const GlobeIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.4 3.9 5.4 3.9 9s-1.3 6.6-3.9 9c-2.6-2.4-3.9-5.4-3.9-9S9.4 5.4 12 3z" /></svg>
);

/** The page you are on, without its language: where each language link should go. Read in the browser, so it is always the real address. */
function useRest() {
  const pathname = usePathname(); const [rest, setRest] = useState(splitLocale(pathname || "/").rest);
  useEffect(() => { setRest(splitLocale(window.location.pathname).rest + window.location.search + window.location.hash); }, [pathname]);
  return rest;
}

/** Every language as a plain link (each language has its own address), written in its own name, with the current one marked. No flags. */
export function LanguageLinks({ onPick, className = "" }: { onPick?: () => void; className?: string }) {
  const { locale, tr } = useI18n(); const rest = useRest();
  return (
    <ul aria-label={tr("Language")} className={`flex flex-wrap gap-x-5 gap-y-1 ${className}`}>
      {LOCALES.map((l) => (
        <li key={l}><a href={switchPath(rest, l)} hrefLang={LOCALE_INFO[l].hreflang} lang={LOCALE_INFO[l].htmlLang} aria-current={l === locale ? "true" : undefined} onClick={onPick} className="focus-ring inline-flex min-h-[44px] items-center font-body text-sm underline-offset-4 hover:text-ochre aria-[current=true]:font-bold aria-[current=true]:underline">{LOCALE_INFO[l].native}</a></li>
      ))}
    </ul>
  );
}

/** The globe button in the header: opens the list of languages. Closes on Escape (focus returns to the button) or a click elsewhere. */
export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, tr } = useI18n(); const [open, setOpen] = useState(false); const btn = useRef<HTMLButtonElement>(null); const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    const click = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", key); document.addEventListener("mousedown", click); return () => { document.removeEventListener("keydown", key); document.removeEventListener("mousedown", click); };
  }, [open]);
  return (
    <div ref={box} className={`relative ${className}`}>
      <button ref={btn} type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="language-menu" aria-label={`${tr("Language")}: ${LOCALE_INFO[locale].native}`} className="focus-ring flex h-11 items-center gap-1.5 rounded-full px-3 font-body text-[0.75rem] font-semibold uppercase tracking-wider text-parchment transition-colors hover:text-ochre">
        <GlobeIcon className="h-5 w-5" /><span aria-hidden="true">{locale}</span>
      </button>
      {open && <div id="language-menu" className="absolute right-0 top-full z-50 mt-2 min-w-[11rem] rounded-[3px] bg-parchment p-3 text-stone shadow-xl"><LanguageLinks onPick={() => setOpen(false)} className="flex-col" /></div>}
    </div>
  );
}
