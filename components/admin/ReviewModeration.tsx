"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteReview, moderateReview } from "@/lib/actions/reviews-admin";
import { REVIEW_MAX_REASON } from "@/lib/reviews";

export default function ReviewModeration({ reviewId, status }: { reviewId: string; status: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error?: string }>) {
    setError("");
    startTransition(async () => {
      try {
        const res = await fn();
        if (res.error) setError(res.error);
        else {
          setRejecting(false);
          router.refresh();
        }
      } catch {
        setError("Something went wrong — please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {status !== "APPROVED" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => moderateReview(reviewId, "APPROVED"))}
            className="focus-ring rounded-full bg-canopy px-4 py-1.5 font-body text-sm text-parchment hover:bg-canopy-deep disabled:opacity-60"
          >
            Approve
          </button>
        )}
        {status !== "REJECTED" && !rejecting && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setRejecting(true)}
            className="focus-ring rounded-full border border-stone/25 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-60"
          >
            Reject…
          </button>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (window.confirm("Delete this review permanently?")) run(() => deleteReview(reviewId));
          }}
          className="focus-ring font-body text-sm text-stone/40 hover:text-rust disabled:opacity-60"
        >
          Delete
        </button>
      </div>

      {rejecting && (
        <div className="flex max-w-md flex-col gap-2">
          <label className="font-body text-xs text-stone/60" htmlFor={`reason-${reviewId}`}>
            Reason shown to the author (optional)
          </label>
          <input
            id={`reason-${reviewId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={REVIEW_MAX_REASON}
            className="input"
            placeholder="e.g. Please keep to your own experience of the stay."
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => moderateReview(reviewId, "REJECTED", reason))}
              className="focus-ring rounded-full bg-rust px-4 py-1.5 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-60"
            >
              Reject review
            </button>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="focus-ring rounded-full border border-stone/25 px-4 py-1.5 font-body text-sm text-stone"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="font-body text-xs text-rust">{error}</p>}
    </div>
  );
}
