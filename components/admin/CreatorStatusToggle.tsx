"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCreatorStatus } from "@/lib/actions/creators-admin";

export default function CreatorStatusToggle({ creatorId, status }: { creatorId: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const next = status === "ACTIVE" ? "PAUSED" : "ACTIVE";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError("");
          startTransition(async () => {
            try {
              const res = await setCreatorStatus(creatorId, next);
              if (res.error) setError(res.error);
              else router.refresh();
            } catch {
              setError("Something went wrong — please try again.");
            }
          });
        }}
        className="focus-ring rounded-full border border-stone/25 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-60"
      >
        {status === "ACTIVE" ? "Pause" : "Resume"}
      </button>
      {error && <p className="font-body text-xs text-rust">{error}</p>}
    </div>
  );
}
