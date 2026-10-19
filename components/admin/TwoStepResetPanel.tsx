"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelTwoStepReset, requestTwoStepReset, type ResetActionCode } from "@/lib/actions/two-step-admin";

const SAY: Record<ResetActionCode, string> = {
  not_allowed: "Only a super admin can do this.", not_found: "That account was not found.", not_super_admin: "Only a super admin can do this.", self: "You can't reset your own: use one of your recovery codes, or ask another super admin.",
  no_two_step: "This person doesn't have two-step sign-in turned on.", already_pending: "A reset is already waiting for this person.", no_site_address: "The site's public address is not set (NEXT_PUBLIC_APP_URL), so the email with the cancel link cannot be sent. Nothing was started.",
  unavailable: "Two-step sign-in has not been switched on for this site.", too_many: "You've done this a lot in the last hour. Please try again later.", invalid: "That request is no longer waiting.", failed: "Something went wrong. Please try again.",
};
type Pending = { id: string; requestedByEmail: string; executeAfter: string; due: boolean };
const BTN = "focus-ring rounded-full border border-stone/30 px-4 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-50";

export default function TwoStepResetPanel({ userId, name, on, available, canAct, pending }: { userId: string; name: string; on: boolean; available: boolean; canAct: boolean; pending: Pending | null }) {
  const router = useRouter(); const [asking, setAsking] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const run = async (f: () => Promise<{ ok: boolean; code?: ResetActionCode }>) => { setBusy(true); setError(""); try { const r = await f(); if (!r.ok) setError(SAY[r.code ?? "failed"]); else { setAsking(false); router.refresh(); } } catch { setError(SAY.failed); } finally { setBusy(false); } };
  const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Nairobi", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  if (!available) return <p className="font-body text-sm text-stone/80">Two-step sign-in has not been switched on for this site yet.</p>;
  return (
    <div className="flex flex-col gap-3 font-body text-sm text-stone">
      <p>Two-step sign-in is <strong>{on ? "on" : "off"}</strong> for {name}.</p>
      {pending && (
        <div role="status" className="rounded-sm border border-ochre/50 bg-ochre-light/20 p-3">
          <p><strong>A reset is waiting.</strong> {pending.requestedByEmail} asked for it. {pending.due ? "The 24 hours are up: it takes effect the next time they sign in." : `It takes effect after ${when(pending.executeAfter)} (Nairobi time), the next time they sign in.`} They were emailed a link to cancel it.</p>
          {canAct && <button type="button" disabled={busy} className={`${BTN} mt-2`} onClick={() => run(() => cancelTwoStepReset(pending.id))}>Cancel the reset</button>}
        </div>
      )}
      {canAct && on && !pending && (asking ? (
        <div className="rounded-sm border border-stone/20 p-3">
          <p className="mb-2">Use this only if {name} has lost their phone <strong>and</strong> their recovery codes. {name} is emailed at once with a link to cancel, the other super admins are told, and it takes effect <strong>24 hours</strong> later, the next time they sign in (they are then signed out everywhere). It is recorded in the audit log.</p>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className={BTN} onClick={() => run(() => requestTwoStepReset(userId))}>{busy ? "Asking\u2026" : "Yes, ask for the reset"}</button><button type="button" className={BTN} onClick={() => { setAsking(false); setError(""); }}>Not now</button></div>
        </div>
      ) : <div><button type="button" className={BTN} onClick={() => setAsking(true)} aria-expanded={asking}>Reset their two-step sign-in…</button></div>)}
      {error && <p role="alert" className="font-bold text-rust-deep">{error}</p>}
    </div>
  );
}
