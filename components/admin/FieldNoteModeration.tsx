"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveFieldNote, hideFieldNote, requestNoteChanges, unhideFieldNote } from "@/lib/actions/field-notes-admin";
import { NOTE_LIMITS } from "@/lib/field-notes";

export default function FieldNoteModeration({ noteId, status, points }: { noteId: string; status: string; points: number }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
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
          setAsking(false);
          setReason("");
          router.refresh();
        }
      } catch {
        setError("Something went wrong — please try again.");
      }
    });
  }

  const btn = "focus-ring rounded-full border border-stone/25 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-60";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {status === "PENDING" && (
          <>
            <button type="button" disabled={isPending} onClick={() => run(() => approveFieldNote(noteId))} className="focus-ring rounded-full bg-canopy px-4 py-1.5 font-body text-sm text-parchment hover:bg-canopy-deep disabled:opacity-60">
              Publish{points > 0 ? ` & award ${points} points` : ""}
            </button>
            {!asking && (
              <button type="button" disabled={isPending} onClick={() => setAsking(true)} className={btn}>
                Request changes…
              </button>
            )}
          </>
        )}
        {status === "APPROVED" && (
          <button type="button" disabled={isPending} onClick={() => run(() => hideFieldNote(noteId))} className={btn}>
            Hide from the public site
          </button>
        )}
        {status === "HIDDEN" && (
          <button type="button" disabled={isPending} onClick={() => run(() => unhideFieldNote(noteId))} className={btn}>
            Restore
          </button>
        )}
      </div>

      {asking && (
        <div className="flex max-w-md flex-col gap-2">
          <label htmlFor={`changes-${noteId}`} className="font-body text-xs text-stone/60">
            What needs to change? The creator will see this.
          </label>
          <textarea id={`changes-${noteId}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={NOTE_LIMITS.reasonMax} rows={3} className="input" />
          <div className="flex gap-2">
            <button type="button" disabled={isPending} onClick={() => run(() => requestNoteChanges(noteId, reason))} className="focus-ring rounded-full bg-rust px-4 py-1.5 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-60">
              Send back
            </button>
            <button type="button" onClick={() => setAsking(false)} className="focus-ring rounded-full border border-stone/25 px-4 py-1.5 font-body text-sm text-stone">
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="font-body text-xs text-rust">{error}</p>}
    </div>
  );
}
