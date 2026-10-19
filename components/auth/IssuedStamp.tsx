"use client";
// The "Karibu" stamp every Passport starts with, drawn the same as in the Passport itself, landing with a thud (unless the phone is set to reduce motion).
import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/client";
import { bandDate } from "@/lib/passport-book";

export default function IssuedStamp({ issuedAt }: { issuedAt: string }) {
  const { tr, locale } = useI18n(); const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current || typeof ref.current.animate !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ref.current.animate([{ transform: "rotate(-7deg) scale(2.2)", opacity: 0 }, { transform: "rotate(-7deg) scale(.92)", opacity: 1, offset: 0.55 }, { transform: "rotate(-7deg) scale(1.04)", offset: 0.72 }, { transform: "rotate(-7deg) scale(1)", opacity: 1 }], { duration: 800, easing: "cubic-bezier(.2,.9,.3,1.2)", fill: "both" });
  }, []);
  const F = { fontFamily: "var(--font-manrope), sans-serif" };
  return (
    <svg ref={ref} viewBox="0 0 120 120" className="mb-5 block h-[190px] w-[190px] text-ochre" style={{ transform: "rotate(-7deg)" }} aria-hidden="true" focusable="false">
      <defs><path id="auth-is-t" d="M20 60A40 40 0 0 1 100 60" /><path id="auth-is-b" d="M13 60A47 47 0 0 0 107 60" /></defs>
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <circle cx="60" cy="60" r="56" strokeWidth="2.6" /><circle cx="60" cy="60" r="51" strokeWidth=".9" /><path d="M40 52Q60 28 80 52M60 28V22M44 40L40 35M76 40L80 35" strokeWidth="2.2" />
        <rect x="20" y="58" width="80" height="17" rx="2" fill="currentColor" stroke="none" />
        <text x="60" y="70.5" textAnchor="middle" style={F} fontSize="9.6" fontWeight="800" letterSpacing=".9" fill="#F6F0DF" stroke="none">{bandDate(issuedAt, locale)}</text>
        <text style={F} fontSize="10.5" fontWeight="800" letterSpacing="1.8" fill="currentColor" stroke="none"><textPath href="#auth-is-t" startOffset="50%" textAnchor="middle">KARIBU</textPath></text>
        <text style={F} fontSize="8.6" fontWeight="800" letterSpacing="1.4" fill="currentColor" stroke="none"><textPath href="#auth-is-b" startOffset="50%" textAnchor="middle">{tr("ISSUED IN TAITA")}</textPath></text>
      </g>
    </svg>
  );
}
