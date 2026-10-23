"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminCancelOrder, adminProcessOrderRefund, type OrderAdminResult } from "@/lib/actions/orders-admin";

const quiet = "focus-ring rounded-full border border-stone/20 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-50";

function useRun() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const running = useRef(false); // set at once, not on the next draw: a second click or a second Enter before the screen updates must not send the action again
  const run = async (fn: () => Promise<OrderAdminResult>) => { if (running.current) return; running.current = true; setBusy(true); setError(""); setMessage(""); try { const r = await fn(); if (!r.ok) setError(r.error); else { setMessage(r.message ?? "Done."); router.refresh(); } } catch { setError("Something went wrong. Please try again."); } finally { running.current = false; setBusy(false); } };
  return { busy, run, note: <>{error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}{message && <p role="status" className="font-body text-sm text-canopy">{message}</p>}</> };
}

/** Cancels an order for good. Asks for a reason, how much to refund (never more than was paid), whether the items go back on the shelf, and a tick that it cannot be undone. */
export function CancelOrderForm({ orderId, paid, ceiling, holdsStock, fulfilled, inFlight }: { orderId: string; paid: number; ceiling: number; holdsStock: boolean; fulfilled: boolean; inFlight: boolean }) {
  const { busy, run, note } = useRun();
  const [reason, setReason] = useState(""); const [amount, setAmount] = useState(String(paid)); const [restock, setRestock] = useState(holdsStock && !fulfilled); const [sure, setSure] = useState(false);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (sure) run(() => adminCancelOrder(orderId, reason, ceiling > 0 ? amount : null, restock)); }} className="mt-2 flex max-w-lg flex-col gap-2">
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" maxLength={200} required className="input" aria-label="Reason for cancelling" />
      {ceiling > 0 ? (
        <label className="flex flex-col gap-1 font-body text-xs text-stone/80">
          {paid > 0 ? `Refund (KES): the most you can refund is what was paid, KES ${paid.toLocaleString("en-KE")}` : `Refund (KES): the site has NOT confirmed a payment on this order, but one may have arrived (see the reason on the order). Check the M-Pesa statement and refund only what you can see was received, up to KES ${ceiling.toLocaleString("en-KE")}`}
          <input type="number" min={0} max={ceiling} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="input" aria-label="Refund in shillings" />
        </label>
      ) : inFlight ? <p className="font-body text-xs text-stone/80">A payment is in progress. If it arrives after you cancel, it will be refunded automatically.</p> : <p className="font-body text-xs text-stone/80">Nothing has been paid, so there is nothing to refund.</p>}
      {holdsStock
        ? <label className="flex items-center gap-2 font-body text-xs text-stone/80"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Put the items back in stock{fulfilled ? " (leave this unticked if they are damaged or lost)" : ""}</label>
        : <p className="font-body text-xs text-stone/80">The stock is already back on the shelf.</p>}
      <label className="flex items-center gap-2 font-body text-xs text-stone/80"><input type="checkbox" required checked={sure} onChange={(e) => setSure(e.target.checked)} /> I understand this cannot be undone</label>
      {note}
      <button type="submit" disabled={busy || !sure} className={`${quiet} w-fit`}>Cancel this order</button>
    </form>
  );
}

/** Records a refund you sent by hand (with the receipt), or that failed (with a note). */
export function OrderRefundForm({ refundId }: { refundId: string }) {
  const { busy, run, note } = useRun();
  const [ref, setRef] = useState(""); const [why, setWhy] = useState("");
  return (
    <div className="mt-2 flex max-w-lg flex-col gap-2">
      <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="M-Pesa receipt of the refund you sent" maxLength={40} className="input" aria-label="M-Pesa receipt" />
      <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Note (required if it failed)" maxLength={300} className="input" aria-label="Note" />
      {note}
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => run(() => adminProcessOrderRefund(refundId, "SENT", ref, why))} className={quiet}>Mark as sent</button>
        <button type="button" disabled={busy} onClick={() => run(() => adminProcessOrderRefund(refundId, "FAILED", ref, why))} className={quiet}>Mark as failed</button>
      </div>
    </div>
  );
}
