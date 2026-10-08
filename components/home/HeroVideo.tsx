"use client";

import { useEffect, useState } from "react";

/** Optional background film. Starts only when the browser is idle, never on a data-saving or slow connection, never for reduced motion. */
export default function HeroVideo({ src, poster }: { src: string; poster?: string }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (c?.saveData || /(^|-)2g$/.test(c?.effectiveType ?? "") || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const w = window as unknown as { requestIdleCallback?: (f: () => void) => number; cancelIdleCallback?: (n: number) => void };
    const id = w.requestIdleCallback ? w.requestIdleCallback(() => setGo(true)) : window.setTimeout(() => setGo(true), 900);
    return () => { if (w.requestIdleCallback) w.cancelIdleCallback?.(id); else clearTimeout(id); };
  }, []);
  if (!go) return null;
  return <video className="absolute inset-0 h-full w-full object-cover" src={src} poster={poster} autoPlay muted loop playsInline preload="auto" aria-hidden="true" tabIndex={-1} />;
}
