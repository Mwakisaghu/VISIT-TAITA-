"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Fades (or unmasks) its content in as it scrolls into view.
 *  - Content is visible in the server-rendered page, so nothing depends on JavaScript to be readable (or indexable).
 *  - Only things that start BELOW the fold are hidden-then-revealed, so nothing flashes or shifts on load.
 *  - Only opacity / transform / clip-path animate: no layout work. Reduced-motion visitors simply see everything.
 */
export default function Reveal({ children, delay = 0, variant = "rise", className = "", innerClassName = "" }: { children: ReactNode; delay?: number; variant?: "rise" | "mask"; className?: string; innerClassName?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "armed" | "in">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return; // already on screen: leave it alone
    setState("armed");
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setState("in"); io.disconnect(); } }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The outer element is what we WATCH and what takes the PLACEMENT classes (className: col-span, sticky, aspect…); `innerClassName` lays out its own children (flex, grid…).
  // The outer element is what we WATCH; the inner one is what fades/unmasks. They must be separate:
  // a browser doesn't count a fully clipped element as on screen, so an element hiding itself with clip-path could never be seen to arrive.
  return (
    <div ref={ref} className={className}>
      <div className={`reveal h-full ${innerClassName}`} data-variant={variant} data-armed={state !== "idle" ? "true" : undefined} data-in={state === "in" ? "true" : undefined} style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}>
        {children}
      </div>
    </div>
  );
}
