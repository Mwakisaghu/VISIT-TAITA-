"use client";
// "Suggest a passphrase": several random words, made on the person's own device, in the language they choose. Browsers' own strong-password suggestion still works alongside it; this is for people without one.
// Any password in any language is accepted: this only helps people who would rather be given one.
import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { makePassphrase } from "@/lib/passphrase";
import { checkPassword } from "@/lib/password-policy";
import { WORD_LISTS } from "@/lib/wordlists";

export default function PassphraseSuggest({ onUse, name, email, id }: { onUse: (phrase: string) => void; name?: string; email?: string; id: string }) {
  const { tr, locale } = useI18n(); const [open, setOpen] = useState(false); const [code, setCode] = useState<string>(WORD_LISTS.some((l) => l.code === locale) ? locale : "en");
  const [phrase, setPhrase] = useState(""); const [busy, setBusy] = useState(false); const cache = useRef<Record<string, readonly string[]>>({});
  async function make(c: string) {
    setBusy(true);
    try {
      const entry = WORD_LISTS.find((l) => l.code === c) ?? WORD_LISTS[0]; const list = (cache.current[entry.code] ??= await entry.load());
      let p = ""; for (let i = 0; i < 12; i++) { p = makePassphrase(list); if (checkPassword(p, { name, email }).ok) break; } // the odd phrase that happens to contain the person's own name is simply drawn again
      setPhrase(p);
    } finally { setBusy(false); }
  }
  const boxId = `${id}-box`;
  return (
    <div className="mt-1">
      <button type="button" aria-expanded={open} aria-controls={boxId} onClick={() => { const next = !open; setOpen(next); if (next && !phrase) void make(code); }} className="inline-flex min-h-[44px] items-center px-0.5 font-body font-bold text-rust-deep underline underline-offset-4">{tr("Suggest a passphrase")}</button>
      {open && (
        <div id={boxId} className="mt-1 rounded-[10px] border-[1.5px] border-dashed border-canopy bg-canopy/5 p-3.5">
          {WORD_LISTS.length > 1 && (
            <div role="group" aria-label={tr("Words in")} className="mb-2 flex flex-wrap items-center gap-2 font-body text-[0.86rem]">
              <span className="text-stone/80">{tr("Words in")}</span>
              {WORD_LISTS.map((l) => (<button key={l.code} type="button" aria-pressed={code === l.code} onClick={() => { setCode(l.code); void make(l.code); }} className={`min-h-[44px] rounded-full border-2 px-4 font-bold ${code === l.code ? "border-canopy bg-canopy text-white" : "border-canopy/50 text-canopy-deep"}`}>{l.name}</button>))}
            </div>
          )}
          <p className="font-body text-[0.8rem] text-stone/80">{tr("Made just now, on your device. Nobody else sees it.")}</p>
          <p aria-live="polite" lang={code} className="my-1.5 break-all font-mono text-[1.05rem] font-bold text-stone">{busy && !phrase ? tr("Making one…") : phrase}</p>
          <div className="flex flex-wrap items-center gap-x-4">
            <button type="button" disabled={!phrase} onClick={() => { onUse(phrase); setOpen(false); }} className="min-h-[44px] rounded-full bg-canopy px-5 font-body font-extrabold text-white disabled:opacity-50">{tr("Use this")}</button>
            <button type="button" onClick={() => void make(code)} className="inline-flex min-h-[44px] items-center font-body font-bold text-rust-deep underline underline-offset-4">{tr("Another one")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
