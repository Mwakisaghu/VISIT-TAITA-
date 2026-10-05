"use client";

import Link from "next/link";
import { useState } from "react";
import { resetPassword } from "@/lib/actions/account-email";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (password.length < 8 || password.length > 72) return setError("Choose a password of 8 to 72 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      const res = await resetPassword(token, password);
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
        <p className="font-body text-lg text-stone/80">Your password has been changed, and you&apos;ve been signed out everywhere else.</p>
        <Link href="/login?reset=1" className="focus-ring w-fit rounded-full bg-rust px-6 py-2.5 font-body text-sm text-parchment hover:bg-rust-deep">
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-stone/70">New password</span>
        <input type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" className="input" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-stone/70">Type it again</span>
        <input type="password" name="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" className="input" />
      </label>
      {error && (
        <p role="alert" className="font-body text-sm text-rust">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="focus-ring w-fit rounded-full bg-rust px-8 py-3 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-60">
        {busy ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
