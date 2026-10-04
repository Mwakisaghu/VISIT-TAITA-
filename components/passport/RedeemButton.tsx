"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redeemReward, type RedeemResult } from "@/lib/actions/rewards";

export default function RedeemButton({
  rewardId,
  rewardName,
  pointsCost,
  balance,
}: {
  rewardId: string;
  rewardName: string;
  pointsCost: number;
  balance: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "busy">("idle");
  const [result, setResult] = useState<RedeemResult | null>(null);

  async function redeem() {
    setStep("busy");
    setResult(null);
    try {
      const res = await redeemReward(rewardId);
      setResult(res);
      if (res.success) router.refresh();
    } catch {
      setResult({ error: "Something went wrong — your points were not spent. Please try again." });
    } finally {
      setStep("idle");
    }
  }

  if (result?.success) {
    return (
      <div role="status" className="rounded-sm border border-canopy/30 bg-canopy/10 p-4">
        <p className="font-body text-sm text-canopy">Redeemed! Your voucher code is</p>
        <p className="mt-1 font-display text-2xl tracking-wider text-stone">{result.code}</p>
        <p className="mt-2 font-body text-xs text-stone/60">
          It&apos;s saved under &quot;Your vouchers&quot; above, with how to use it. {result.newBalance} points left.
        </p>
      </div>
    );
  }

  if (balance < pointsCost) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-full border border-stone/15 px-5 py-2.5 font-body text-sm text-stone/40"
      >
        {pointsCost - balance} more points needed
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {step === "confirm" ? (
        <div className="rounded-sm border border-stone/15 p-3">
          <p className="font-body text-sm text-stone">
            Spend <strong>{pointsCost} points</strong> on {rewardName}?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={redeem}
              className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
            >
              Yes, redeem
            </button>
            <button
              type="button"
              onClick={() => setStep("idle")}
              className="focus-ring rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone hover:border-rust"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={step === "busy"}
          onClick={() => setStep("confirm")}
          className="focus-ring w-full rounded-full bg-rust px-5 py-2.5 font-body text-sm text-parchment transition-colors hover:bg-rust-deep disabled:opacity-60"
        >
          {step === "busy" ? "Redeeming…" : `Redeem for ${pointsCost} points`}
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
