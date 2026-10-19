"use client";
// The page the emailed link opens: one button that stops a reset of this person's two-step sign-in. It is a button (not a link that acts when opened) so mail scanners that open links cannot cancel it by accident.
import Link from "next/link";
import { useState } from "react";
import { cancelResetWithToken } from "@/lib/actions/two-step-admin";
import { useI18n } from "@/lib/i18n/client";

export default function CancelResetForm({ token }: { token: string }) {
  const { tr, lp } = useI18n(); const [state, setState] = useState<"ask" | "busy" | "done" | "invalid" | "many">("ask");
  const go = async () => { if (state === "busy") return; setState("busy"); try { const r = await cancelResetWithToken(token); setState(r.ok ? "done" : r.code === "too_many" ? "many" : "invalid"); } catch { setState("invalid"); } };
  const BTN = "flex min-h-[54px] w-full items-center justify-center rounded-full bg-rust font-body text-base font-extrabold text-white hover:bg-rust-deep disabled:opacity-60";
  const LINK = "inline-flex min-h-[44px] items-center font-body font-bold text-rust-deep underline underline-offset-4";
  if (!token) return <p role="alert" className="font-body text-stone/80">{tr("Open the link from your email to cancel a reset.")}</p>;
  if (state === "done") return (<div role="status"><p className="mb-4 font-body font-bold text-canopy-deep">{tr("The reset was cancelled. Nothing has changed on your account. As a precaution, change your password.")}</p><Link href={lp("/forgot-password")} className={LINK}>{tr("Change my password")}</Link></div>);
  if (state === "invalid" || state === "many") return (<div role="alert"><p className="mb-4 font-body text-[#8E2A12]">{state === "many" ? tr("Too many attempts. Please wait a few minutes and try again.") : tr("This link is no longer valid. It may already have been used, or the reset may have been cancelled or finished. If you did not expect a reset, change your password and contact us.")}</p><Link href={lp("/forgot-password")} className={LINK}>{tr("Change my password")}</Link></div>);
  return (<div><p className="mb-5 font-body text-stone/80">{tr("A super admin asked to reset the two-step sign-in on your account. If you did not expect this, cancel it now. Nothing has changed yet.")}</p><button type="button" disabled={state === "busy"} onClick={go} className={BTN}>{state === "busy" ? tr("Cancelling…") : tr("Cancel the reset")}</button></div>);
}
