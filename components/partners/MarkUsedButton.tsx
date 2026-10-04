"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markVoucherUsed, type VoucherActionResult } from "@/lib/actions/partner-vouchers";

export default function MarkUsedButton({ redemptionId }: { redemptionId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "busy">("idle");
  const [result, setResult] = useState<VoucherActionResult | null>(null);

  async function mark() {
    setStep("busy");
    setResult(null);
    try {
      const res = await markVoucherUsed(redemptionId);
      setResult(res);
      if (res.success) router.refresh();
    } catch {
      setResult({ error: "Something went wrong — please try again." });
    } finally {
      setStep("idle");
    }
  }

  if (result?.success) {
    return (
      <p role="status" className="font-body text-sm text-canopy">
        Marked as used ✓
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {step === "confirm" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-body text-sm text-stone">Mark this voucher as used?</span>
          <button
            type="button"
            onClick={mark}
            className="focus-ring rounded-full bg-canopy px-4 py-1.5 font-body text-sm text-parchment hover:bg-canopy-deep"
          >
            Yes, mark used
          </button>
          <button
            type="button"
            onClick={() => setStep("idle")}
            className="focus-ring rounded-full border border-stone/25 px-4 py-1.5 font-body text-sm text-stone hover:border-rust"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={step === "busy"}
          onClick={() => setStep("confirm")}
          className="focus-ring w-fit rounded-full bg-canopy px-5 py-2 font-body text-sm text-parchment hover:bg-canopy-deep disabled:opacity-60"
        >
          {step === "busy" ? "Saving…" : "Mark as used"}
        </button>
      )}
      {result?.error && (
        <p role="alert" className="font-body text-sm text-rust">
          {result.error}
        </p>
      )}
    </div>
  );
}
