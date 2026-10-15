"use client";

import { useI18n } from "@/lib/i18n/client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unsubscribeNewsletter } from "@/lib/actions/account";

export default function UnsubscribeButton() {
  const { tr } = useI18n();
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError("");
          startTransition(async () => {
            try {
              const res = await unsubscribeNewsletter();
              if (res.error) setError(res.error);
              else router.refresh();
            } catch {
              setError(tr("Something went wrong — please try again."));
            }
          });
        }}
        className="focus-ring w-fit rounded-full border border-stone/25 px-5 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-60"
      >
        {isPending ? tr("Unsubscribing…") : tr("Unsubscribe")}
      </button>
      {error && (
        <p role="alert" className="font-body text-xs text-rust">
          {error}
        </p>
      )}
    </div>
  );
}
