"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retryDueEmails } from "@/lib/actions/email-admin";
import { deleteCampaign, requestReconfirmation } from "@/lib/actions/newsletter-admin";

const btn = "focus-ring rounded-full border border-stone/25 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-60";

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

function Feedback({ message, error }: { message: string; error: string }) {
  return (
    <>
      {message && (
        <p role="status" className="font-body text-xs text-canopy">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="max-w-xs font-body text-xs text-rust">
          {error}
        </p>
      )}
    </>
  );
}

/** "Send next batch" for a newsletter that is still going out. */
export function SendNextBatchButton() {
  const { run, message, error, isPending } = useRunner();
  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" disabled={isPending} onClick={() => run(() => retryDueEmails())} className={btn}>
        {isPending ? "Sending…" : "Send next batch"}
      </button>
      <Feedback message={message} error={error} />
    </div>
  );
}

export function DeleteDraftButton({ id }: { id: string }) {
  const { run, error, isPending } = useRunner();
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (window.confirm("Delete this draft?")) run(() => deleteCampaign(id));
        }}
        className="focus-ring font-body text-sm text-stone/40 hover:text-rust disabled:opacity-60"
      >
        Delete
      </button>
      <Feedback message="" error={error} />
    </div>
  );
}

/** Asks subscribers from before double opt-in to confirm. */
export function ReconfirmButton({ count }: { count: number }) {
  const { run, message, error, isPending } = useRunner();
  return (
    <div className="flex flex-col gap-2">
      <button type="button" disabled={isPending} onClick={() => run(() => requestReconfirmation())} className={btn}>
        {isPending ? "Sending…" : `Ask ${count} subscriber${count === 1 ? "" : "s"} to confirm`}
      </button>
      <Feedback message={message} error={error} />
    </div>
  );
}
