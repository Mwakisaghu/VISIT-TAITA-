"use client";

import { useEffect, useRef, useState } from "react";
import { FacebookIcon, WhatsAppIcon } from "@/components/social/SocialIcons";
import { useI18n } from "@/lib/i18n/client";
import { cleanTitle, facebookLink, shareUrl, whatsappLink } from "@/lib/share";

/** Where the share buttons send the browser (a seam, so tests can see the destination without leaving the page). */
export const shareNav = { open: (url: string) => { window.open(url, "_blank", "noopener,noreferrer"); } };

const btn = "focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-[2px] border border-stone/30 px-4 font-body text-[0.78rem] font-semibold text-stone transition-colors hover:border-stone hover:bg-stone hover:text-parchment";
const icon = "h-5 w-5";

/**
 * Share this page: the phone's own share sheet (where there is one), WhatsApp, Facebook and copy-link. It shares the page you are on, in the language you are reading,
 * with a short message in that language. Nothing is sent anywhere until a button is pressed.
 */
export default function ShareBar({ className = "" }: { className?: string }) {
  const { tr } = useI18n(); const [native, setNative] = useState(false); const [status, setStatus] = useState(""); const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => { setNative(typeof navigator !== "undefined" && typeof navigator.share === "function"); return () => clearTimeout(timer.current); }, []);
  const say = (m: string) => { setStatus(m); clearTimeout(timer.current); timer.current = setTimeout(() => setStatus(""), 4000); };
  const where = (channel?: string) => shareUrl(window.location.href, { origin: process.env.NEXT_PUBLIC_APP_URL ?? null, channel });
  const message = () => tr("{title}, on Visit Taita", { title: cleanTitle(document.title) });
  const wa = () => { const u = where("whatsapp"); if (u) shareNav.open(whatsappLink(message(), u)); };
  const fb = () => { const u = where("facebook"); if (u) shareNav.open(facebookLink(u)); };
  const sheet = async () => { const u = where("share"); if (!u) return; try { await navigator.share({ title: cleanTitle(document.title), text: message(), url: u }); } catch { /* closed without sharing: nothing to say */ } };
  const copy = async () => {
    const u = where(); if (!u) return;
    try { await navigator.clipboard.writeText(u); say(tr("Link copied")); }
    catch {
      try { const t = document.createElement("textarea"); t.value = u; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); const ok = document.execCommand("copy"); document.body.removeChild(t); say(ok ? tr("Link copied") : tr("Couldn't copy the link")); }
      catch { say(tr("Couldn't copy the link")); }
    }
  };
  return (
    <div role="group" aria-label={tr("Share this page")} className={`flex flex-wrap items-center gap-2 ${className}`}>
      {native && <button type="button" onClick={sheet} className={btn}><svg aria-hidden="true" viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6" /></svg>{tr("Share")}</button>}
      <button type="button" onClick={wa} aria-label={`${tr("Share on WhatsApp")} (${tr("opens in a new tab")})`} className={btn}><WhatsAppIcon className={icon} />WhatsApp</button>
      <button type="button" onClick={fb} aria-label={`${tr("Share on Facebook")} (${tr("opens in a new tab")})`} className={btn}><FacebookIcon className={icon} />Facebook</button>
      <button type="button" onClick={copy} className={btn}><svg aria-hidden="true" viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>{tr("Copy link")}</button>
      <span role="status" aria-live="polite" className="font-body text-sm font-semibold text-canopy-deep">{status}</span>
    </div>
  );
}
