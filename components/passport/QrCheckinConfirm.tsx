"use client";

import { useState } from "react";
import Link from "next/link";
import { checkInWithToken, type CheckinResult } from "@/lib/actions/passport";
import CheckinResultMessage from "@/components/passport/CheckinResultMessage";

export default function QrCheckinConfirm({
  token,
  destinationName,
}: {
  token: string;
  destinationName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);

  async function confirm() {
    setBusy(true);
    setResult(null);
    try {
      setResult(await checkInWithToken(token));
    } catch {
      setResult({ error: "Something went wrong checking you in — please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!result?.success && (
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="focus-ring w-full rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep disabled:opacity-60"
        >
          {busy ? "Checking in…" : `Check in at ${destinationName}`}
        </button>
      )}

      {result && <CheckinResultMessage result={result} />}

      {result?.success && (
        <Link
          href="/passport"
          className="focus-ring w-full rounded-full border border-stone/25 px-6 py-3 text-center font-body text-sm text-stone transition-colors hover:border-rust hover:text-rust"
        >
          View my Passport
        </Link>
      )}
    </div>
  );
}
