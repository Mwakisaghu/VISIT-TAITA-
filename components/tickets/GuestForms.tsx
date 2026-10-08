"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelMyTicketsAction, claimPaymentAction, type TicketResult } from "@/lib/actions/tickets";

const quiet = "focus-ring rounded-full border border-stone/20 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-50";
function useRun() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const run = async (fn: () => Promise<TicketResult>) => { setBusy(true); setError(""); setMessage(""); try { const r = await fn(); if (!r.ok) setError(r.error); else { setMessage(r.message); router.refresh(); } } catch { setError("Something went wrong — please try again."); } finally { setBusy(false); } };
  return { busy, run, note: <>{error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}{message && <p role="status" className="font-body text-sm text-canopy">{message}</p>}</> };
}

/** "I've paid — here's my M-Pesa code". Helps the organiser match the payment; it doesn't confirm anything by itself. */
export function ClaimPaymentForm({ groupId, existing }: { groupId: string; existing: string | null }) {
  const { busy, run, note } = useRun(); const [code, setCode] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => claimPaymentAction(groupId, code)); }} className="flex max-w-md flex-col gap-2">
      {existing && <p className="font-body text-sm text-stone/80">You told us you paid with <strong>{existing}</strong>. We&apos;re waiting for the organiser to confirm it.</p>}
      <label className="flex flex-col gap-1 font-body text-sm text-stone/70">{existing ? "Change the M-Pesa code" : "Paid? Enter the M-Pesa confirmation code"}
        <input value={code} onChange={(e) => setCode(e.target.value)} required placeholder="e.g. QGH7ABC123" maxLength={20} className="input" aria-label="M-Pesa code" />
      </label>
      {note}
      <button type="submit" disabled={busy} className={`${quiet} w-fit`}>{busy ? "Saving…" : "Tell the organiser I've paid"}</button>
    </form>
  );
}

export function CancelMyTicketsButton({ groupId }: { groupId: string }) {
  const { busy, run, note } = useRun(); const [sure, setSure] = useState(false);
  if (!sure) return <button type="button" onClick={() => setSure(true)} className={quiet}>Cancel these tickets</button>;
  return (
    <div className="flex max-w-md flex-col gap-2 rounded-sm border border-rust/30 bg-rust/5 p-3">
      <p className="font-body text-sm text-stone/80">Cancel these tickets? They can&apos;t be brought back.</p>
      {note}
      <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => run(() => cancelMyTicketsAction(groupId))} className={quiet}>Yes, cancel them</button><button type="button" onClick={() => setSure(false)} className={quiet}>Keep them</button></div>
    </div>
  );
}
