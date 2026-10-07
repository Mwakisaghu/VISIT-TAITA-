"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reinstateUser, suspendUser, type UsersAdminResult } from "@/lib/actions/users-admin";

/** Suspend or reinstate straight from the accounts list. The server applies exactly the same rules as on the account's own page. */
export default function UserRowActions({ userId, name, suspended }: { userId: string; name: string; suspended: boolean }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn: () => Promise<UsersAdminResult>) => {
    setBusy(true); setError("");
    try { const r = await fn(); if (r.error) setError(r.error); else { setAsking(false); setReason(""); router.refresh(); } } catch { setError("Something went wrong — please try again."); } finally { setBusy(false); }
  };
  const quiet = "focus-ring rounded-full border border-stone/20 px-3 py-1 font-body text-xs text-stone hover:border-rust hover:text-rust disabled:opacity-50";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-3">
        {suspended
          ? <button type="button" disabled={busy} onClick={() => run(() => reinstateUser(userId))} className={quiet} aria-label={`Reinstate ${name}`}>Reinstate</button>
          : <button type="button" onClick={() => setAsking(!asking)} aria-expanded={asking} className={quiet} aria-label={`Suspend ${name}`}>Suspend…</button>}
      </div>
      {asking && !suspended && (
        <form onSubmit={(e) => { e.preventDefault(); run(() => suspendUser(userId, reason)); }} className="flex w-64 flex-col gap-2 rounded-sm border border-rust/30 bg-rust/5 p-3 text-left">
          <label className="font-body text-xs text-stone/70" htmlFor={`why-${userId}`}>Why? (other admins will see it)</label>
          <input id={`why-${userId}`} value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} maxLength={200} required className="input" />
          <p className="font-body text-xs text-stone/60">They are signed out and can&apos;t sign in until reinstated.</p>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="focus-ring rounded-full bg-rust px-3 py-1 font-body text-xs text-parchment hover:bg-rust-deep disabled:opacity-50">{busy ? "Suspending…" : "Suspend"}</button>
            <button type="button" onClick={() => { setAsking(false); setError(""); }} className="focus-ring rounded-full border border-stone/20 px-3 py-1 font-body text-xs text-stone">Cancel</button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="max-w-[16rem] text-right font-body text-xs text-rust">{error}</p>}
    </div>
  );
}
