"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { checkPasswordChange, PASSWORD_MIN } from "@/lib/account-security-rules";
import { changeMyPassword } from "@/lib/actions/account-security";
import { useI18n } from "@/lib/i18n/client";
import { passwordProblemText } from "@/lib/password-policy-text";

const LINK = "focus-ring inline-flex min-h-11 items-center font-body text-[0.95rem] font-bold text-rust-deep underline underline-offset-2 hover:text-stone";
const PRIMARY = "focus-ring inline-flex min-h-11 items-center justify-center rounded bg-rust px-5 font-body text-sm font-bold text-white disabled:opacity-60";
const SECONDARY = "focus-ring inline-flex min-h-11 items-center justify-center rounded border-2 border-stone px-5 font-body text-sm font-bold text-stone";

/** The password row: when it was last changed, and a form to change it. Needs the CURRENT password; on success every sign-in ends, this one included. */
export default function ChangePasswordForm({ summary, name, email }: { summary: string; name: string; email: string }) {
  const { tr, lp } = useI18n();
  const [open, setOpen] = useState(false); const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [again, setAgain] = useState("");
  const [show, setShow] = useState(false); const [error, setError] = useState<{ field: "current" | "next" | "again" | "form"; text: string } | null>(null); const [done, setDone] = useState(false); const [pending, start] = useTransition();
  const first = useRef<HTMLInputElement>(null); const toggle = useRef<HTMLButtonElement>(null); const wasOpen = useRef(false);
  useEffect(() => { if (open) first.current?.focus(); else if (wasOpen.current) toggle.current?.focus(); wasOpen.current = open; }, [open]);
  const type = show ? "text" : "password";

  const reason = (code: string): string => code === "wrong_password" ? tr("That isn't your current password.") : code === "missing_current" ? tr("Enter your current password.")
    : code === "same_password" ? tr("Choose a different password from your current one.") : code === "not_signed_in" ? tr("Please sign in again.")
    : code === "too_many" ? tr("Too many tries. Please wait a while and try again.") : code === "gone" ? tr("This account no longer exists.") : tr("Something went wrong — please try again.");

  function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const check = checkPasswordChange(current, next, { email, name });
    if (!check.ok) { setError(check.code === "weak" && check.policy ? { field: "next", text: passwordProblemText(check.policy, tr) } : { field: check.code === "missing_current" ? "current" : "next", text: reason(check.code) }); return; }
    if (next !== again) { setError({ field: "again", text: tr("The two new passwords are not the same.") }); return; }
    start(async () => {
      try {
        const r = await changeMyPassword(current, next);
        if (r.ok) { setDone(true); await signOut({ callbackUrl: `${lp("/login")}?reset=1` }); return; }
        setError(r.code === "weak" && r.policy ? { field: "next", text: passwordProblemText(r.policy, tr) } : { field: r.code === "wrong_password" || r.code === "missing_current" ? "current" : r.code === "same_password" ? "next" : "form", text: reason(r.code) });
      } catch { setError({ field: "form", text: reason("failed") }); }
    });
  }
  const bad = (f: string) => (error?.field === f ? true : undefined);
  const err = (f: string) => error?.field === f && <p id={`pw-${f}-error`} role="alert" className="font-body text-sm font-semibold text-rust-deep">{error.text}</p>;
  const field = (id: "current" | "next" | "again", label: string, value: string, set: (v: string) => void, auto: string, ref?: React.Ref<HTMLInputElement>, hint?: string) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`pw-${id}`} className="font-body text-sm font-bold text-stone">{label}</label>
      <input id={`pw-${id}`} ref={ref} type={type} name={id === "current" ? "currentPassword" : "newPassword"} value={value} onChange={(e) => set(e.target.value)} autoComplete={auto} aria-invalid={bad(id)} aria-describedby={[hint ? `pw-${id}-hint` : "", error?.field === id ? `pw-${id}-error` : ""].join(" ").trim() || undefined} className="input w-full max-w-md" />
      {hint && <p id={`pw-${id}-hint`} className="font-body text-[0.85rem] text-stone/80">{hint}</p>}
      {err(id)}
    </div>
  );

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between gap-3">
        <span className="min-w-0">{summary}</span>
        <button ref={toggle} type="button" aria-expanded={open} aria-controls="change-password-panel" onClick={() => { setOpen((v) => !v); setError(null); }} className={LINK}>{tr("Change password")}</button>
      </div>
      {open && (
        <div id="change-password-panel" className="mt-3 border-t border-stone/15 pt-4">
          {done ? <p role="status" className="font-body text-[0.95rem] font-semibold text-canopy-deep">{tr("Password changed. For your safety you are being signed out everywhere. Please sign in with your new password.")}</p> : (
            <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
              {field("current", tr("Current password"), current, setCurrent, "current-password", first)}
              {field("next", tr("New password"), next, setNext, "new-password", undefined, tr("At least {min} characters. Avoid common passwords and your own name.", { min: PASSWORD_MIN }))}
              {field("again", tr("Confirm new password"), again, setAgain, "new-password")}
              <label className="inline-flex min-h-11 items-center gap-2.5 font-body text-sm text-stone"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-5 w-5" />{tr("Show passwords")}</label>
              {err("form")}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <button type="submit" disabled={pending} className={PRIMARY}>{pending ? tr("Saving…") : tr("Save new password")}</button>
                <button type="button" onClick={() => { setOpen(false); setError(null); setCurrent(""); setNext(""); setAgain(""); }} className={SECONDARY}>{tr("Cancel")}</button>
              </div>
              <Link href={lp("/forgot-password")} className={LINK}>{tr("Forgot your current password? Reset it by email")}</Link>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
