"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRedemptionStatus } from "@/lib/actions/rewards-admin";

export default function RedemptionActions({
  redemptionId,
  status,
  pointsSpent,
}: {
  redemptionId: string;
  status: string;
  pointsSpent: number;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (status !== "ISSUED") return null;

  function change(next: "USED" | "CANCELLED") {
    if (
      next === "CANCELLED" &&
      !window.confirm(`Cancel this voucher and refund ${pointsSpent} points to the visitor?`)
    ) {
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const result = await setRedemptionStatus(redemptionId, next);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch {
        setError("Couldn't update the voucher — please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => change("USED")}
          className="focus-ring rounded-full bg-canopy px-4 py-1.5 font-body text-sm text-parchment hover:bg-canopy-deep disabled:opacity-60"
        >
          Mark used
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => change("CANCELLED")}
          className="focus-ring rounded-full border border-stone/25 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-60"
        >
          Cancel &amp; refund
        </button>
      </div>
      {error && <p className="font-body text-xs text-rust">{error}</p>}
    </div>
  );
}
