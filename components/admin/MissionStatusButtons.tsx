"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMission, setMissionStatus } from "@/lib/actions/missions-admin";

export default function MissionStatusButtons({
  missionId,
  status,
  claimCount,
}: {
  missionId: string;
  status: string;
  claimCount: number;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error?: string }>) {
    setError("");
    startTransition(async () => {
      try {
        const res = await fn();
        if (res.error) setError(res.error);
        else router.refresh();
      } catch {
        setError("Something went wrong — please try again.");
      }
    });
  }

  const btn =
    "focus-ring rounded-full border border-stone/25 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-60";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {status !== "OPEN" && (
          <button type="button" disabled={isPending} onClick={() => run(() => setMissionStatus(missionId, "OPEN"))} className={btn}>
            {status === "CLOSED" ? "Reopen" : "Open"}
          </button>
        )}
        {status === "OPEN" && (
          <button type="button" disabled={isPending} onClick={() => run(() => setMissionStatus(missionId, "CLOSED"))} className={btn}>
            Close
          </button>
        )}
        {claimCount === 0 && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (window.confirm("Delete this mission permanently?")) run(() => deleteMission(missionId));
            }}
            className="focus-ring font-body text-sm text-stone/40 hover:text-rust disabled:opacity-60"
          >
            Delete
          </button>
        )}
      </div>
      {error && <p className="max-w-xs text-right font-body text-xs text-rust">{error}</p>}
    </div>
  );
}
