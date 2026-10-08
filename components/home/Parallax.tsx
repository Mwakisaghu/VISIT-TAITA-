"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Moves its content a little slower than the page scrolls (depth). Transform only; paused off-screen; off for reduced motion. */
export default function Parallax({ children, speed = 0.15, className = "" }: { children: ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current; const box = el?.parentElement;
    if (!el || !box || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0; let visible = true;
    const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; }) : null;
    io?.observe(box);
    const update = () => { raf = 0; if (!visible) return; el.style.transform = `translate3d(0, ${Math.round(-box.getBoundingClientRect().top * speed)}px, 0)`; };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => { window.removeEventListener("scroll", onScroll); io?.disconnect(); if (raf) cancelAnimationFrame(raf); el.style.transform = ""; };
  }, [speed]);

  return <div ref={ref} className={className} style={{ willChange: "transform" }}>{children}</div>;
}
