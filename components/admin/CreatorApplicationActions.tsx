"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveCreatorApplication, rejectCreatorApplication } from "@/lib/actions/creators-admin";
import { CREATOR_LIMITS } from "@/lib/creators";

export default function CreatorApplicationActions({ applicationId }: { applicationId: string }) {
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
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => approveCreatorApplication(applicationId))}
          className="focus-ring rounded-full bg-canopy px-4 py-1.5 font-body text-sm text-parchment hover:bg-canopy-deep disabled:opacity-60"
        >
          Approve &amp; create profile
        </button>
        {!rejecting && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setRejecting(true)}
            className="focus-ring rounded-full border border-stone/25 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-60"
          >
            Reject…
          </button>
        )}
      </div>

      {rejecting && (
        <div className="flex max-w-md flex-col gap-2">
          <label className="font-body text-xs text-stone/60" htmlFor={`reason-${applicationId}`}>
            Note shown to the applicant (optional)
          </label>
          <input
            id={`reason-${applicationId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={CREATOR_LIMITS.reasonMax}
            className="input"
            placeholder="e.g. Please add a link to some of your work and apply again."
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => rejectCreatorApplication(applicationId, reason))}
              className="focus-ring rounded-full bg-rust px-4 py-1.5 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-60"
            >
              Reject application
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
