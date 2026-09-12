"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getOrderPaymentStatus,
  initiateMpesaPayment,
  createPesapalOrder,
} from "@/lib/actions/payments";

export default function PaymentStatusPoller({
  orderId,
  status,
  paymentMethod,
}: {
  orderId: string;
  status: string;
  paymentMethod: string;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");

  useEffect(() => {
    if (status !== "PENDING") return;

    const interval = setInterval(async () => {
      const result = await getOrderPaymentStatus(orderId);
      if ("status" in result && result.status !== "PENDING") {
        router.refresh();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status, orderId, router]);

  if (status === "PAID") {
    return <p className="font-body text-sm text-canopy">Payment confirmed.</p>;
  }

  if (status === "PENDING") {
    return (
      <p className="font-body text-sm text-stone/60">
        {paymentMethod === "MPESA"
          ? "Waiting for M-Pesa confirmation — check your phone for the payment prompt."
          : "Waiting for card payment confirmation…"}
      </p>
    );
  }

  if (status === "FAILED") {
    async function handleRetry() {
      setRetrying(true);
      setRetryError("");
      if (paymentMethod === "MPESA") {
        const result = await initiateMpesaPayment(orderId);
        setRetrying(false);
        if (result?.error) {
          setRetryError(result.error);
          return;
        }
        router.refresh();
      } else {
        const result = await createPesapalOrder(orderId);
        setRetrying(false);
        if (result?.error || !result?.url) {
          setRetryError(result?.error ?? "Could not start card payment.");
          return;
        }
        window.location.href = result.url;
      }
    }

    return (
      <div>
        <p className="font-body text-sm text-rust">Payment didn&apos;t go through.</p>
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="focus-ring mt-3 rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-60"
        >
          {retrying ? "Retrying…" : "Retry payment"}
        </button>
        {retryError && <p className="mt-2 font-body text-sm text-rust">{retryError}</p>}
      </div>
    );
  }

  // UNPAID — shouldn't normally be seen on this page since checkout always
  // initiates a payment attempt, but handle it gracefully just in case.
  return (
    <p className="font-body text-sm text-stone/60">
      Payment hasn&apos;t been started for this order yet.
    </p>
  );
}
