"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import type { Season } from "@/app/essentials/content";

export type MonthInfo = { name: string; short: string; season: Season };
/** What a season is called and what the page says about it (the page's own sentences, passed in already translated). */
export type SeasonText = { title: string; body: string };

const FILL: Record<Season, string> = {
  dry: "bg-ochre text-stone",
  long: "bg-canopy-deep text-parchment",
  short: "text-stone",
  "dry-short": "text-stone",
};
// The short rains are told apart by a stripe as well as a colour (colour alone is not enough for everyone). October is the end of the dry season AND the start of the short rains, so it is both.
const STRIPE = "repeating-linear-gradient(135deg,#8FB09B 0 6px,#A8C4B3 6px 12px)";
const BG: Partial<Record<Season, string>> = { short: STRIPE, "dry-short": `linear-gradient(90deg,#C99A3E 0 55%,transparent 55%),${STRIPE}` };
const parts = (s: Season): ("dry" | "long" | "short")[] => (s === "dry-short" ? ["dry", "short"] : [s]);

/**
 * The year as twelve buttons. It marks this month ("Now") once the page is in the browser (the page itself is built once and cached, so it cannot know the date),
 * and tapping any month says what it is like, which is how someone planning a trip in March compares it with July. Without JavaScript it is still a readable list of months.
 */
export default function MonthStrip({ months, seasons }: { months: MonthInfo[]; seasons: Record<"dry" | "long" | "short", SeasonText> }) {
  const { tr } = useI18n();
  const [now, setNow] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => { setNow(new Date().getMonth()); }, []);
  const shown = picked ?? now;
  const m = shown === null ? null : months[shown];
  return (
    <div>
      <ol aria-label={tr("Months of the year")} className="grid grid-cols-6 gap-x-1.5 gap-y-5 pt-3 sm:grid-cols-12 sm:gap-x-1.5">
        {months.map((mo, i) => (
          <li key={mo.name} className="relative">
            {now === i && <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-[2px] bg-rust px-1.5 py-1 font-body text-[0.6rem] font-bold uppercase leading-none tracking-[0.12em] text-white">{tr("Now")}</span>}
            <button
              type="button"
              aria-pressed={shown === i}
              aria-current={now === i ? "date" : undefined}
              onClick={() => setPicked(picked === i ? null : i)}
              style={BG[mo.season] ? { backgroundImage: BG[mo.season] } : undefined}
              className={`focus-ring flex h-14 w-full items-end rounded-[3px] p-2 text-left font-body text-[0.8rem] font-bold sm:h-[72px] ${FILL[mo.season]} ${shown === i ? "outline outline-[3px] outline-offset-2 outline-rust" : ""}`}
            >
              <span aria-hidden="true">{mo.short}</span>
              <span className="sr-only">{mo.name}: {parts(mo.season).map((p) => seasons[p].title).join(", ")}</span>
            </button>
          </li>
        ))}
      </ol>
      {m && (
        <div role="region" aria-live="polite" aria-label={tr("About this month")} className="mt-6 rounded-[4px] border border-stone/15 bg-[#FBF7EA] p-5">
          <p className="font-body text-[0.7rem] font-bold uppercase tracking-[0.14em] text-rust-deep">{m.name}{shown === now ? ` · ${tr("This month")}` : ""}</p>
          {parts(m.season).map((p) => (
            <p key={p} className="mt-2 font-body text-base leading-relaxed text-stone/90"><strong className="font-bold">{seasons[p].title}.</strong> {seasons[p].body}</p>
          ))}
        </div>
      )}
    </div>
  );
}
