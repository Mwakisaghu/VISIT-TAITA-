"use client";

import { createElement, useRef, type ReactNode } from "react";
import { useScrollEdges } from "@/components/ui/useScrollEdges";
import { fadeMask } from "@/lib/scroll-rail";

/**
 * A sideways-scrolling row (filter chips, short lists) that shows, with a soft fade at the edge, when more is hidden.
 * The fade appears only while something IS hidden, on the side where it is, and never on screens wide enough to show everything.
 */
export default function ScrollFade({ as = "div", className, children, ...rest }: { as?: "div" | "nav" | "ul"; className?: string; children: ReactNode; "aria-label"?: string; role?: string }) {
  const ref = useRef<HTMLElement>(null); const { edges } = useScrollEdges(ref); const mask = fadeMask(edges);
  return createElement(as, { ref, className, style: mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined, ...rest }, children);
}
