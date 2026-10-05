"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { discardEmail, retryDueEmails, retryEmail } from "@/lib/actions/email-admin";

const btn =
  "focus-ring rounded-full border border-stone/25 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-60";

function useRunner() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error?: string; message?: string }>) {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const res = await fn();
        if (res.error) setError(res.error);
        else {
          if (res.message) setMessage(res.message);
          router.refresh();
        }
      } catch {
        setError("Something went wrong — please try again.");
      }
    });
  }
  return { run, message, error, isPending };
}

/** Retry now / Discard for one email. */
export function EmailRowActions({ id, status }: { id: string; status: string }) {
  const { run, error, isPending } = useRunner();
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {status !== "SENT" && (
          <button type="button" disabled={isPending} onClick={() => run(() => retryEmail(id))} className={btn}>
            Retry now
          </button>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (window.confirm("Remove this entry (and its stored message) for good?")) run(() => discardEmail(id));
          }}
          className="focus-ring font-body text-sm text-stone/40 hover:text-rust disabled:opacity-60"
        >
          Discard
        </button>
      </div>
      {error && <p className="max-w-xs text-right font-body text-xs text-rust">{error}</p>}
    </div>
  );
}

/** Retry everything that's due, and say what happened. */
export function RetryDueButton() {
  const { run, message, error, isPending } = useRunner();
  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" disabled={isPending} onClick={() => run(() => retryDueEmails())} className={btn}>
        {isPending ? "Retrying…" : "Retry due now"}
      </button>
      {message && (
        <p role="status" className="font-body text-xs text-canopy">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="max-w-xs text-right font-body text-xs text-rust">
          {error}
        </p>
      )}
    </div>
  );
}
