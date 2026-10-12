"use client";

import { Children, useRef, type ReactNode } from "react";
import { ArrowIcon } from "@/components/home/icons";
import { useScrollEdges } from "@/components/ui/useScrollEdges";
import { fadeMask, railStatus } from "@/lib/scroll-rail";

/**
 * A swipeable row of cards. Phones: the next card peeks in at the edge, the row fades at the side where more is hidden, and a thin progress bar
 * with "2 / 4" shows where you are. From md up: previous / next buttons. Nothing is shown when every card already fits. Screen readers hear "Experiences: 2 of 4".
 */
export default function HorizontalRail({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null); const { edges, active } = useScrollEdges(ref, true); const total = Children.toArray(children).length;
  const go = (dir: 1 | -1) => { const el = ref.current; if (!el) return; const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduced ? "auto" : "smooth" }); };
  const mask = fadeMask(edges);
  const btn = "focus-ring flex h-12 w-12 items-center justify-center rounded-full border border-stone/25 text-stone transition-colors hover:border-rust hover:text-rust disabled:cursor-default disabled:opacity-35 disabled:hover:border-stone/25 disabled:hover:text-stone";
  return (
    <div>
      <div ref={ref} role="region" aria-label={label} tabIndex={0} style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined} className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-pl-6 px-6 pb-2 focus-visible:outline-offset-[-2px]">{children}</div>
      {edges.overflow && (
        <div className="mt-6 flex items-center gap-4">
          <div aria-hidden="true" className="relative h-1 flex-1 rounded-full bg-stone/15"><span className="absolute inset-y-0 rounded-full bg-rust" style={{ width: `${edges.thumb * 100}%`, left: `${edges.progress * (1 - edges.thumb) * 100}%` }} /></div>
          <p aria-hidden="true" className="font-body text-xs font-semibold tabular-nums text-stone/75">{Math.min(active, total - 1) + 1} / {total}</p>
          <div className="hidden gap-3 md:flex">
            <button type="button" onClick={() => go(-1)} disabled={edges.atStart} aria-label={`${label}: previous`} className={btn}><ArrowIcon className="h-5 w-5 rotate-180" /></button>
            <button type="button" onClick={() => go(1)} disabled={edges.atEnd} aria-label={`${label}: next`} className={btn}><ArrowIcon className="h-5 w-5" /></button>
          </div>
        </div>
      )}
      <p className="sr-only" aria-live="polite">{railStatus(active, total, label, edges.overflow)}</p>
    </div>
  );
}
