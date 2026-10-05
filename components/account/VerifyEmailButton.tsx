"use client";

import Link from "next/link";
import { useState } from "react";
import { verifyEmail } from "@/lib/actions/account-email";

/** A button that verifies the address. The page only ever SHOWS this; nothing happens on page load. */
export default function VerifyEmailButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await verifyEmail(token);
      if (res.ok) setDone(true);
      else setError(res.error);
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <p className="font-body text-lg text-stone/80">Thank you — your email address is verified.</p>
        <Link href="/account" className="focus-ring w-fit rounded-full bg-rust px-6 py-2.5 font-body text-sm text-parchment hover:bg-rust-deep">
          Go to your account
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <button type="button" disabled={busy} onClick={run} className="focus-ring w-fit rounded-full bg-rust px-8 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep disabled:opacity-60">
        {busy ? "Verifying…" : "Yes, verify my email"}
      </button>
      {error && (
        <p role="alert" className="font-body text-sm text-rust">
          {error}
        </p>
      )}
    </div>
  );
}
