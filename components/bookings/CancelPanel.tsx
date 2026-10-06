"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelMyBooking, previewCancellation } from "@/lib/actions/bookings";

const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

/** Shows exactly what a cancellation would refund BEFORE the guest confirms it. */
export default function CancelPanel({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<{ refund: number; paid: number; basis: string; percent: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!preview) {
    return (
      <div className="flex flex-col gap-2">
        <button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(""); const r = await previewCancellation(bookingId).catch(() => null); setBusy(false); if (!r || !r.ok) return setError((r && !r.ok && r.error) || "Something went wrong."); setPreview(r); }} className="focus-ring w-fit rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-50">
          Cancel this booking
        </button>
        {error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}
      </div>
    );
  }
  return (
    <div className="flex max-w-md flex-col gap-3 rounded-sm border border-stone/15 p-4">
      <p className="font-body text-sm text-stone">
        {preview.paid === 0 ? "Nothing has been paid, so cancelling is free." : preview.refund > 0 ? <>If you cancel now you&apos;ll get <strong>{kes(preview.refund)}</strong> back ({preview.basis === "cooling_off" ? "you're within 24 hours of booking" : `${preview.percent}% under the cancellation policy`}).</> : <>If you cancel now you&apos;ll get <strong>no refund</strong> under the cancellation policy.</>}
      </p>
      {error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}
      <div className="flex gap-3">
        <button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(""); const r = await cancelMyBooking(bookingId).catch(() => null); setBusy(false); if (!r || !r.ok) return setError((r && !r.ok && r.error) || "Something went wrong."); router.refresh(); }} className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-50">Yes, cancel it</button>
        <button type="button" onClick={() => setPreview(null)} className="focus-ring rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone">Keep my booking</button>
      </div>
    </div>
  );
}
