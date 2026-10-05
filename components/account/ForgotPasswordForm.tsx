"use client";

import { useState } from "react";
import { requestPasswordReset } from "@/lib/actions/account-email";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await requestPasswordReset(email);
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
      <p role="status" className="font-body text-lg leading-relaxed text-stone/80">
        If an account uses that address, we&apos;ve emailed it a link to choose a new password. It works once, for an hour. Check your inbox and your spam folder.
      </p>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-stone/70">Your email address</span>
        <input type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="input" />
      </label>
      {error && (
        <p role="alert" className="font-body text-sm text-rust">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || email.trim() === ""} className="focus-ring w-fit rounded-full bg-rust px-8 py-3 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-60">
        {busy ? "Sending…" : "Email me a reset link"}
      </button>
    </form>
  );
}
