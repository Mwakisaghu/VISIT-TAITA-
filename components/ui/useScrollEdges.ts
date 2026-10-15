"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { NO_EDGES, activeIndex, edgeState, type Edges } from "@/lib/scroll-rail";

/** Watches a sideways-scrolling element: what is hidden on each side, how far along it is, and (optionally) which child is current. */
export function useScrollEdges(ref: RefObject<HTMLElement | null>, trackItems = false): { edges: Edges; active: number } {
  const [state, setState] = useState<{ edges: Edges; active: number }>({ edges: NO_EDGES, active: 0 });
  const measure = useCallback(() => {
    const el = ref.current; if (!el) return;
    const edges = edgeState({ scrollLeft: el.scrollLeft, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth });
    let active = 0;
    if (trackItems && edges.overflow) { const r0 = el.getBoundingClientRect().left; active = activeIndex([...el.children].map((c) => { const b = (c as HTMLElement).getBoundingClientRect(); return { left: b.left - r0 + el.scrollLeft, width: b.width }; }), el.scrollLeft, edges.atEnd); }
    setState((s) => (s.active === active && s.edges.overflow === edges.overflow && s.edges.atStart === edges.atStart && s.edges.atEnd === edges.atEnd && Math.abs(s.edges.progress - edges.progress) < 0.004 && s.edges.thumb === edges.thumb ? s : { edges, active }));
  }, [ref, trackItems]);
  useEffect(() => {
    const el = ref.current; if (!el) return; measure();
    el.addEventListener("scroll", measure, { passive: true }); window.addEventListener("resize", measure);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null; ro?.observe(el);
    return () => { el.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); ro?.disconnect(); };
  }, [ref, measure]);
  return state;
}
