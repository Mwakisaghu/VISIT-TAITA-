"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decideBooking, hostCancelBooking, markAttendance, type HostResult } from "@/lib/actions/bookings-host";

const quiet = "focus-ring rounded-full border border-stone/20 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-50";
const solid = "focus-ring rounded-full bg-rust px-4 py-1.5 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-50";

export default function HostBookingActions({ bookingId, status, started }: { bookingId: string; status: string; started: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [asking, setAsking] = useState<null | "decline" | "cancel">(null); const [reason, setReason] = useState("");
  const go = async (fn: () => Promise<HostResult>) => { setBusy(true); setError(""); setMessage(""); try { const r = await fn(); if (!r.ok) setError(r.error); else { setMessage(r.message ?? "Done."); setAsking(null); setReason(""); router.refresh(); } } catch { setError("Something went wrong."); } finally { setBusy(false); } };
  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "REQUESTED" && <><button type="button" disabled={busy} onClick={() => go(() => decideBooking(bookingId, "accept"))} className={solid}>Accept</button><button type="button" onClick={() => setAsking(asking === "decline" ? null : "decline")} className={quiet}>Decline</button></>}
        {(status === "CONFIRMED" || status === "AWAITING_PAYMENT") && !started && <button type="button" onClick={() => setAsking(asking === "cancel" ? null : "cancel")} className={quiet}>Cancel (full refund)</button>}
        {status === "CONFIRMED" && started && <><button type="button" disabled={busy} onClick={() => go(() => markAttendance(bookingId, "COMPLETED"))} className={quiet}>Came</button><button type="button" disabled={busy} onClick={() => go(() => markAttendance(bookingId, "NO_SHOW"))} className={quiet}>No-show</button></>}
      </div>
      {asking && (
        <div className="flex max-w-md flex-col gap-2">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={asking === "decline" ? "Reason (optional)" : "Reason (the guest will see it)"} maxLength={200} className="input" aria-label="Reason" />
          <button type="button" disabled={busy} onClick={() => go(() => (asking === "decline" ? decideBooking(bookingId, "decline", reason) : hostCancelBooking(bookingId, reason)))} className={solid}>{asking === "decline" ? "Decline request" : "Cancel and refund in full"}</button>
        </div>
      )}
      {error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}
      {message && <p role="status" className="font-body text-sm text-canopy">{message}</p>}
    </div>
  );
}
