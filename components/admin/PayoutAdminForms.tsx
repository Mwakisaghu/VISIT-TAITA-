"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { preparePayouts, recordPayoutAction, savePayoutSettingsAction, type PayoutResult } from "@/lib/actions/payouts";

const quiet = "focus-ring rounded-full border border-stone/20 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-50";

function useRun() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const run = async (fn: () => Promise<PayoutResult>) => { setBusy(true); setError(""); setMessage(""); try { const r = await fn(); if (!r.ok) setError(r.error); else { setMessage(r.message); router.refresh(); } } catch { setError("Something went wrong — please try again."); } finally { setBusy(false); } };
  return { busy, run, note: <>{error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}{message && <p role="status" className="font-body text-sm text-canopy">{message}</p>}</> };
}

export function PayoutSettingsForm({ commissionPercent, holdDays }: { commissionPercent: number; holdDays: number }) {
  const { busy, run, note } = useRun(); const [c, setC] = useState(String(commissionPercent)); const [h, setH] = useState(String(holdDays));
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => savePayoutSettingsAction(c, h)); }} className="flex max-w-xl flex-col gap-3">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 font-body text-sm text-stone/70">Visit Taita keeps (%)<input value={c} onChange={(e) => setC(e.target.value)} inputMode="numeric" required className="input" aria-label="Commission percent" /></label>
        <label className="flex flex-col gap-1 font-body text-sm text-stone/70">Hold earnings for (days)<input value={h} onChange={(e) => setH(e.target.value)} inputMode="numeric" required className="input" aria-label="Holding days" /></label>
      </div>
      <p className="font-body text-xs text-stone/60">The percentage is taken from what guests paid and kept (after refunds). Earnings are held this many days after the experience, then can be paid out. A change applies to payouts prepared from now on; payouts already prepared keep the rate they were prepared with.</p>
      {note}
      <button type="submit" disabled={busy} className={`${quiet} w-fit`}>{busy ? "Saving…" : "Save"}</button>
    </form>
  );
}

export function PrepareButton({ hostId, label }: { hostId: string | null; label: string }) {
  const { busy, run, note } = useRun();
  return <div className="flex flex-col items-start gap-1"><button type="button" disabled={busy} onClick={() => run(() => preparePayouts(hostId))} className={quiet}>{busy ? "Preparing…" : label}</button>{note}</div>;
}

export function RecordPayoutForm({ payoutId }: { payoutId: string }) {
  const { busy, run, note } = useRun(); const [ref, setRef] = useState(""); const [why, setWhy] = useState(""); const [cancelling, setCancelling] = useState(false);
  return (
    <div className="mt-2 flex max-w-lg flex-col gap-2">
      <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="M-Pesa receipt of the payment you sent" maxLength={40} className="input" aria-label="M-Pesa receipt" />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => run(() => recordPayoutAction(payoutId, "SENT", ref, ""))} className={quiet}>Mark as sent</button>
        <button type="button" onClick={() => setCancelling(!cancelling)} aria-expanded={cancelling} className={quiet}>I couldn&apos;t send it…</button>
      </div>
      {cancelling && (
        <div className="flex flex-col gap-2 rounded-sm border border-rust/30 bg-rust/5 p-3">
          <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Why? (e.g. the number isn't registered for M-Pesa)" maxLength={200} className="input" aria-label="Why it wasn't sent" />
          <p className="font-body text-xs text-stone/60">The bookings go back to &ldquo;ready&rdquo; and appear in the next payout you prepare.</p>
          <button type="button" disabled={busy} onClick={() => run(() => recordPayoutAction(payoutId, "CANCEL", "", why))} className={`${quiet} w-fit`}>Cancel this payout</button>
        </div>
      )}
      {note}
    </div>
  );
}
