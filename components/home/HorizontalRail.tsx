"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowIcon } from "@/components/home/icons";

/** A swipeable row (touch, trackpad, keyboard arrows) with previous / next buttons for mouse users. */
export default function HorizontalRail({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = ref.current; if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);
  useEffect(() => { measure(); const el = ref.current; el?.addEventListener("scroll", measure, { passive: true }); window.addEventListener("resize", measure); return () => { el?.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); }; }, [measure]);

  const go = (dir: 1 | -1) => { const el = ref.current; if (!el) return; const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduced ? "auto" : "smooth" }); };
  const btn = "focus-ring flex h-12 w-12 items-center justify-center rounded-full border border-stone/25 text-stone transition-colors hover:border-rust hover:text-rust disabled:cursor-default disabled:opacity-30 disabled:hover:border-stone/25 disabled:hover:text-stone";

  return (
    <div>
      <div ref={ref} role="region" aria-label={label} tabIndex={0} className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-pl-6 px-6 pb-2 focus-visible:outline-offset-[-2px] md:gap-5">{children}</div>
      <div className="mt-8 hidden justify-end gap-3 md:flex">
        <button type="button" onClick={() => go(-1)} disabled={edge.start} aria-label={`${label}: previous`} className={btn}><ArrowIcon className="h-5 w-5 rotate-180" /></button>
        <button type="button" onClick={() => go(1)} disabled={edge.end} aria-label={`${label}: next`} className={btn}><ArrowIcon className="h-5 w-5" /></button>
      </div>
    </div>
  );
}
