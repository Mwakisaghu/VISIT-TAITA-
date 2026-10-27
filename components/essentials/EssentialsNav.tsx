"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

/**
 * The page's own jump bar: it sticks under the site header, marks the section you are reading, and has a "Plan your day" button at its end.
 * Links are real anchors, so it works without JavaScript; the script only adds the highlight. The scrollbar of the row is hidden (a fade shows there is more),
 * not the ability to scroll.
 */
export default function EssentialsNav({ sections }: { sections: { id: string; label: string }[] }) {
  const { tr, lp } = useI18n();
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const seen = new Map<string, number>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
      const best = [...seen.entries()].sort((a, b) => b[1] - a[1])[0];
      if (best && best[1] > 0) setActive(best[0]);
    }, { rootMargin: "-120px 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);
  return (
    <div className="sticky top-[72px] z-30 border-y border-stone/15 bg-parchment/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6">
        <nav aria-label={tr("On this page")} className="relative min-w-0 flex-1">
          <ul className="flex gap-2 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sections.map((s) => (
              <li key={s.id} className="shrink-0">
                <a href={`#${s.id}`} aria-current={active === s.id ? "true" : undefined} className={`focus-ring inline-flex min-h-[44px] items-center rounded-full px-5 font-body text-sm font-bold ${active === s.id ? "bg-stone text-parchment" : "border border-stone/40 text-stone hover:border-stone"}`}>{s.label}</a>
              </li>
            ))}
          </ul>
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-parchment to-transparent lg:hidden" />
        </nav>
        <a href={lp("/plan")} className="focus-ring hidden min-h-[44px] shrink-0 items-center rounded-[2px] bg-rust px-5 font-body text-[0.7rem] font-bold uppercase tracking-[0.18em] text-white hover:bg-rust-deep md:inline-flex">{tr("Plan your day")}</a>
      </div>
    </div>
  );
}
