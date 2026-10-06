"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { goTo } from "@/components/bookings/redirect";
import { getBookingStatus, payWithCard, payWithMpesa } from "@/lib/actions/bookings";

const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
const btn = "focus-ring rounded-full px-6 py-3 font-body text-sm disabled:opacity-50";

/** Pay what is due, by M-Pesa or card. While a payment is in progress it asks the server (which asks the provider) until it resolves. */
export default function PayPanel(p: { bookingId: string; amount: number; kind: string; defaultPhone: string; mpesa: boolean; card: boolean; waiting: boolean }) {
  const router = useRouter();
  const [phone, setPhone] = useState(p.defaultPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [polling, setPolling] = useState(p.waiting);
  const ticks = useRef(0);

  useEffect(() => {
    if (!polling) return;
    let live = true;
    const tick = async () => {
      if (!live) return;
      ticks.current++;
      const r = await getBookingStatus(p.bookingId).catch(() => null);
      if (!live) return;
      if (r && r.ok && !r.waiting) { setPolling(false); router.refresh(); return; }
      if (ticks.current >= 40) { setPolling(false); setMessage("We haven't heard back yet. If you entered your PIN, refresh this page in a minute."); return; }
      setTimeout(tick, 4000);
    };
    const first = setTimeout(tick, 3000);
    return () => { live = false; clearTimeout(first); };
  }, [polling, p.bookingId, router]);

  if (!p.mpesa && !p.card) return <p className="font-body text-sm text-stone/70">Online payment isn&apos;t set up yet. Please contact the host to arrange payment.</p>;
  const label = p.kind === "BALANCE" ? "Pay the balance" : p.kind === "DEPOSIT" ? "Pay the deposit" : "Pay now";

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-sm text-stone">{label}: <strong>{kes(p.amount)}</strong></p>
      {p.mpesa && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true); setError(""); setMessage("");
            const r = await payWithMpesa(p.bookingId, phone).catch(() => ({ ok: false as const, error: "Something went wrong — please try again." }));
            setBusy(false);
            if (!r.ok) return setError(r.error);
            setMessage(r.message ?? "Check your phone."); ticks.current = 0; setPolling(true);
          }}
          className="flex flex-col gap-2"
        >
          <label className="flex flex-col gap-1 font-body text-sm text-stone/70">M-Pesa number<input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" required placeholder="0712 345 678" className="input" /></label>
          <button type="submit" disabled={busy || polling} className={`${btn} w-fit bg-rust text-parchment hover:bg-rust-deep`}>{polling ? "Waiting for M-Pesa…" : `Pay ${kes(p.amount)} with M-Pesa`}</button>
        </form>
      )}
      {p.card && (
        <button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(""); const r = await payWithCard(p.bookingId).catch(() => ({ ok: false as const, error: "Something went wrong — please try again." })); setBusy(false); if (!r.ok) return setError(r.error); if (r.url) goTo(r.url); }} className={`${btn} w-fit border border-stone/20 text-stone hover:border-rust hover:text-rust`}>
          Pay {kes(p.amount)} by card
        </button>
      )}
      {error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}
      {message && <p role="status" className="font-body text-sm text-canopy">{message}</p>}
    </div>
  );
}
