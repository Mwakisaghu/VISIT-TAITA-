"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { savePayoutPhone } from "@/lib/actions/payouts";

/** Where a host's payouts are sent. Shows only a masked version of the saved number. */
export default function PayoutPhoneForm({ maskedCurrent }: { maskedCurrent: string | null }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setError(""); setMessage("");
        try { const r = await savePayoutPhone(phone); if (!r.ok) setError(r.error); else { setMessage(r.message); setPhone(""); router.refresh(); } } catch { setError("Something went wrong — please try again."); } finally { setBusy(false); }
      }}
      className="flex max-w-md flex-col gap-3"
    >
      <p className="font-body text-sm text-stone/80">{maskedCurrent ? <>Payouts are sent to <strong>{maskedCurrent}</strong>.</> : <strong className="text-rust">You haven&apos;t set a payout number yet — we can&apos;t pay you until you do.</strong>}</p>
      <label className="flex flex-col gap-1 font-body text-sm text-stone/70">{maskedCurrent ? "Change it to" : "Your M-Pesa number"}
        <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" required placeholder="0712 345 678" autoComplete="tel" className="input" />
      </label>
      {error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}
      {message && <p role="status" className="font-body text-sm text-canopy">{message}</p>}
      <button type="submit" disabled={busy} className="focus-ring w-fit rounded-full bg-rust px-6 py-2.5 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-50">{busy ? "Saving…" : maskedCurrent ? "Change number" : "Save number"}</button>
    </form>
  );
}
