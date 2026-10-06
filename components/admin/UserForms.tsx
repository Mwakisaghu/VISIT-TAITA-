"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeRole, inviteStaff, reinstateUser, sendPasswordLink, sendVerificationLink, signOutEverywhere, suspendUser, type UsersAdminResult } from "@/lib/actions/users-admin";
import { roleLabel } from "@/lib/user-admin";

const label = "font-body text-sm text-stone/70";
const btn = "focus-ring rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-50";
const primary = "focus-ring rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-50";

/** Runs an action, shows its message or error, and refreshes the page. */
function useRunner() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function run(fn: () => Promise<UsersAdminResult>, onDone?: (r: UsersAdminResult) => void) {
    setBusy(true); setError(""); setMessage("");
    try {
      const r = await fn();
      if (r.error) { setError(r.error); return; }
      setMessage(r.message ?? "Done.");
      onDone?.(r);
      router.refresh();
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }
  const note = (<>{error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}{message && <p role="status" className="font-body text-sm text-canopy">{message}</p>}</>);
  return { busy, run, note };
}

export function InviteForm({ roles }: { roles: { value: string; help: string }[] }) {
  const router = useRouter();
  const { busy, run, note } = useRunner();
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget; run(() => inviteStaff(new FormData(form)), (r) => { form.reset(); if (r.id) router.push(`/admin/users/${r.id}`); }); }}
      className="flex max-w-xl flex-col gap-4"
    >
      <label className="flex flex-col gap-1"><span className={label}>Full name</span><input name="name" required minLength={2} maxLength={80} autoComplete="off" className="input" /></label>
      <label className="flex flex-col gap-1"><span className={label}>Email address</span><input name="email" type="email" required maxLength={254} autoComplete="off" className="input" /></label>
      <fieldset className="flex flex-col gap-2">
        <legend className={label}>Role</legend>
        {roles.map((r, i) => (
          <label key={r.value} className="flex items-start gap-2 font-body text-sm text-stone">
            <input type="radio" name="role" value={r.value} defaultChecked={i === roles.length - 1} className="mt-1" />
            <span><strong>{roleLabel(r.value)}</strong><span className="block text-xs text-stone/60">{r.help}</span></span>
          </label>
        ))}
      </fieldset>
      <p className="font-body text-xs text-stone/60">We email them a link to choose <strong>their own</strong> password (valid for 7 days). You never see or set one.</p>
      {note}
      <button type="submit" disabled={busy} className={`${primary} w-fit`}>{busy ? "Sending…" : "Send invitation"}</button>
    </form>
  );
}

export function RoleForm({ userId, current, roles }: { userId: string; current: string; roles: string[] }) {
  const { busy, run, note } = useRunner();
  const [role, setRole] = useState(roles.includes(current) ? current : roles[0] ?? "");
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => changeRole(userId, role)); }} className="flex max-w-md flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className={label}>Role</span>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="input" aria-label="Role">
          {roles.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
        </select>
      </label>
      {note}
      <button type="submit" disabled={busy || role === current} className={`${btn} w-fit`}>{busy ? "Saving…" : "Change role"}</button>
    </form>
  );
}

export function SuspendForm({ userId }: { userId: string }) {
  const { busy, run, note } = useRunner();
  const [reason, setReason] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => suspendUser(userId, reason), () => setReason("")); }} className="flex max-w-md flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className={label}>Reason (other admins will see it)</span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} maxLength={200} required className="input" />
      </label>
      {note}
      <button type="submit" disabled={busy} className="focus-ring w-fit rounded-full border border-rust/50 px-5 py-2 font-body text-sm text-rust hover:bg-rust/10 disabled:opacity-50">{busy ? "Suspending…" : "Suspend this account"}</button>
    </form>
  );
}

export function UserActions({ userId, suspended, verified, pendingInvite }: { userId: string; suspended: boolean; verified: boolean; pendingInvite: boolean }) {
  const { busy, run, note } = useRunner();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {suspended && <button type="button" disabled={busy} onClick={() => run(() => reinstateUser(userId))} className={primary}>Reinstate</button>}
        {!suspended && <button type="button" disabled={busy} onClick={() => run(() => sendPasswordLink(userId))} className={btn}>{pendingInvite ? "Send invitation again" : "Send password link"}</button>}
        {!suspended && !verified && !pendingInvite && <button type="button" disabled={busy} onClick={() => run(() => sendVerificationLink(userId))} className={btn}>Send verification link</button>}
        <button type="button" disabled={busy} onClick={() => run(() => signOutEverywhere(userId))} className={btn}>Sign out everywhere</button>
      </div>
      {note}
    </div>
  );
}
