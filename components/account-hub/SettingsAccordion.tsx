"use client";

import { useEffect } from "react";

/**
 * The settings sections are plain <details> elements: closed on a phone (one tap opens each), and this opens them all on a wide screen, and opens the one a link points at (#security).
 * Without JavaScript they still work: each opens with a tap.
 */
export default function SettingsAccordion() {
  useEffect(() => {
    const apply = () => {
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      if (wide) document.querySelectorAll<HTMLDetailsElement>("details[data-settings]").forEach((d) => { d.open = true; });
      const target = document.getElementById(window.location.hash.slice(1));
      if (target instanceof HTMLDetailsElement) target.open = true;
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);
  return null;
}
