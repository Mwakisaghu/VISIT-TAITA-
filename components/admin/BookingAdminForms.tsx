"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminCancelBooking, processRefund, type AdminBookingResult } from "@/lib/actions/bookings-admin";

const quiet = "focus-ring rounded-full border border-stone/20 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-50";

function useRun() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const run = async (fn: () => Promise<AdminBookingResult>) => { setBusy(true); setError(""); setMessage(""); try { const r = await fn(); if (!r.ok) setError(r.error); else { setMessage(r.message ?? "Done."); router.refresh(); } } catch { setError("Something went wrong."); } finally { setBusy(false); } };
  return { busy, run, note: <>{error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}{message && <p role="status" className="font-body text-sm text-canopy">{message}</p>}</> };
}

export function AdminCancelForm({ bookingId }: { bookingId: string }) {
  const { busy, run, note } = useRun();
  const [reason, setReason] = useState(""); const [full, setFull] = useState(false);
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => adminCancelBooking(bookingId, reason, full)); }} className="mt-2 flex max-w-lg flex-col gap-2">
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" maxLength={200} required className="input" aria-label="Reason" />
      <label className="flex items-center gap-2 font-body text-xs text-stone/70"><input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} /> Extenuating circumstances — refund in full, whatever the policy</label>
      {note}
      <button type="submit" disabled={busy} className={`${quiet} w-fit`}>Cancel this booking</button>
    </form>
  );
}

export function RefundForm({ refundId }: { refundId: string }) {
  const { busy, run, note } = useRun();
  const [ref, setRef] = useState(""); const [why, setWhy] = useState("");
  return (
    <div className="mt-2 flex max-w-lg flex-col gap-2">
      <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="M-Pesa receipt of the refund you sent" maxLength={40} className="input" aria-label="M-Pesa receipt" />
      <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Note (required if it failed)" maxLength={300} className="input" aria-label="Note" />
      {note}
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => run(() => processRefund(refundId, "SENT", ref, why))} className={quiet}>Mark as sent</button>
        <button type="button" disabled={busy} onClick={() => run(() => processRefund(refundId, "FAILED", ref, why))} className={quiet}>Mark as failed</button>
      </div>
    </div>
  );
}
