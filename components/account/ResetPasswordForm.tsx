"use client";

import Link from "next/link";
import { useState } from "react";
import PassphraseSuggest from "@/components/auth/PassphraseSuggest";
import PasswordChecklist from "@/components/auth/PasswordChecklist";
import PasswordField from "@/components/auth/PasswordField";
import { resetPassword } from "@/lib/actions/account-email";
import { useI18n } from "@/lib/i18n/client";
import { checkPassword } from "@/lib/password-policy";
import { passwordProblemText } from "@/lib/password-policy-text";

export default function ResetPasswordForm({ token }: { token: string }) {
  const { tr, lp } = useI18n();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const strength = checkPassword(password);
    if (!strength.ok) return setError(passwordProblemText(strength, tr));
    setBusy(true);
    try {
      const res = await resetPassword(token, password);
      if (res.ok) setDone(true);
      else setError(res.reason ? passwordProblemText({ ok: false, reason: res.reason, detail: res.detail, message: res.error }, tr) : res.error);
    } catch {
      setError(tr("Something went wrong \u2014 please try again."));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="rounded-lg border-[1.5px] border-canopy bg-canopy/10 p-5 font-body">
        <p className="font-bold text-canopy-deep">{tr("Your password has been changed, and you've been signed out everywhere else.")}</p>
        <Link href={lp("/login?reset=1")} className="mt-3 inline-flex min-h-[44px] items-center font-bold text-rust-deep underline underline-offset-4">{tr("Sign in")}</Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="max-w-[440px]">
      <PasswordField id="new-password" label={tr("New password")} value={password} onChange={setPassword} autoComplete="new-password" describedBy="new-password-checks">
        <PasswordChecklist id="new-password-checks" password={password} />
        <PassphraseSuggest id="reset-passphrase" onUse={setPassword} />
      </PasswordField>
      {error && <p role="alert" className="mb-4 rounded-lg border-[1.5px] border-[#8E2A12] bg-[#F6DDD3] p-3 font-body text-[0.94rem] font-bold text-[#8E2A12]">{error}</p>}
      <button type="submit" disabled={busy} className="flex min-h-[54px] w-full items-center justify-center rounded-full bg-rust font-body text-base font-extrabold text-white hover:bg-rust-deep disabled:opacity-60">
        {busy ? tr("Saving\u2026") : tr("Set new password")}
      </button>
    </form>
  );
}
