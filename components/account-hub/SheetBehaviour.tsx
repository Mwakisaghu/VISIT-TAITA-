"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * What the ticket panel does with JavaScript (without it, the panel and its links still work): focus moves to the panel's title when it opens, Escape closes it, and when it is a sheet over a PHONE-sized screen the page
 * behind stops scrolling, the sheet is announced as a dialog, and Tab stays inside it. When it closes, focus goes back to the ticket that opened it. Beside the list on a large screen it is not a dialog, so none of
 * the trapping happens.
 */
export default function SheetBehaviour({ closeHref }: { closeHref: string }) {
  const router = useRouter();
  useEffect(() => {
    const sheet = document.getElementById("ticket-sheet"); const title = document.getElementById("ticket-sheet-title");
    const small = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 1023px)").matches;
    const before = document.body.style.overflow;
    title?.focus({ preventScroll: true });
    if (small && sheet) { document.body.style.overflow = "hidden"; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); router.push(closeHref, { scroll: false }); return; }
      if (e.key !== "Tab" || !small || !sheet) return;
      const items = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE)); if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1], active = document.activeElement as HTMLElement | null;
      if (!active || !sheet.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && (active === first || active === title)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey); document.body.style.overflow = before;
      if (sheet) { sheet.removeAttribute("role"); sheet.removeAttribute("aria-modal"); }
      (document.querySelector('[aria-current="true"]') as HTMLElement | null)?.focus({ preventScroll: true });
    };
  }, [closeHref, router]);
  return null;
}
