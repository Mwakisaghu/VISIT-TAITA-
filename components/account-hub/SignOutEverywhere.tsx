"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { signOutEverywhere } from "@/lib/actions/account-security";
import { useI18n } from "@/lib/i18n/client";

const LINK = "focus-ring inline-flex min-h-11 items-center font-body text-[0.95rem] font-bold text-rust-deep underline underline-offset-2 hover:text-stone";
const PRIMARY = "focus-ring inline-flex min-h-11 items-center justify-center rounded bg-rust px-5 font-body text-sm font-bold text-white disabled:opacity-60";
const SECONDARY = "focus-ring inline-flex min-h-11 items-center justify-center rounded border-2 border-stone px-5 font-body text-sm font-bold text-stone";

/** "Sign out everywhere": asks once ("including this one"), then ends every sign-in. Other devices drop within a few minutes (the sign-in is rechecked that often). */
export default function SignOutEverywhere({ summary }: { summary: string }) {
  const { tr, lp } = useI18n(); const [asking, setAsking] = useState(false); const [error, setError] = useState(""); const [pending, start] = useTransition();
  const reason = (code: string) => code === "too_many" ? tr("Too many tries. Please wait a while and try again.") : code === "not_signed_in" ? tr("Please sign in again.") : tr("Something went wrong — please try again.");
  function confirm() {
    setError("");
    start(async () => {
      try { const r = await signOutEverywhere(); if (!r.ok) { setError(reason(r.code)); return; } await signOut({ callbackUrl: `${lp("/login")}?signedout=1` }); }
      catch { setError(reason("failed")); }
    });
  }
  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between gap-3">
        <span className="min-w-0">{summary}</span>
        {!asking && <button type="button" onClick={() => setAsking(true)} className={LINK}>{tr("Sign out everywhere")}</button>}
      </div>
      {asking && (
        <div className="mt-3 flex flex-col gap-3 border-t border-stone/15 pt-4" role="group" aria-label={tr("Sign out everywhere")}>
          <p className="font-body text-[0.95rem] text-stone">{tr("Sign out of every device, including this one? Other devices are signed out within a few minutes.")}</p>
          {error && <p role="alert" className="font-body text-sm font-semibold text-rust-deep">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={confirm} disabled={pending} className={PRIMARY}>{pending ? tr("Signing out…") : tr("Yes, sign out everywhere")}</button>
            <button type="button" onClick={() => { setAsking(false); setError(""); }} disabled={pending} className={SECONDARY}>{tr("Cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
