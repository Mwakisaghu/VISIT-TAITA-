"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resendVerification } from "@/lib/actions/account-email";

export default function ResendVerificationButton() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setMessage("");
          setError("");
          startTransition(async () => {
            try {
              const res = await resendVerification();
              if (!res.ok) setError(res.error);
              else if (res.already) router.refresh();
              else setMessage("Sent — check your inbox (and your spam folder).");
            } catch {
              setError("Something went wrong — please try again.");
            }
          });
        }}
        className="focus-ring w-fit rounded-full border border-stone/25 px-5 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Send me a new link"}
      </button>
      {message && (
        <p role="status" className="font-body text-xs text-canopy">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="max-w-sm font-body text-xs text-rust">
          {error}
        </p>
      )}
    </div>
  );
}
