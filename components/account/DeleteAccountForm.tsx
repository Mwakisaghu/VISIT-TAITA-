"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { deleteMyAccount } from "@/lib/actions/account";

export default function DeleteAccountForm() {
  const [password, setPassword] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await deleteMyAccount(password);
      if (res.error) {
        setError(res.error);
        return;
      }
      setDone(true);
      // The account is gone; end this browser's session too.
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p role="status" className="font-body text-stone/80">
        Your account has been deleted. Signing you out…
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-stone/70">Enter your password to confirm</span>
        <input
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="input"
        />
      </label>
      <label className="flex items-start gap-3 font-body text-sm text-stone/80">
        <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-1" />
        <span>I understand this is permanent and can&apos;t be undone.</span>
      </label>

      {error && (
        <p role="alert" className="font-body text-sm text-rust">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !understood || password.length === 0}
        className="focus-ring w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}
