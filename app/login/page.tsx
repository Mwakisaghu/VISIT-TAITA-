"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import AuthShell from "@/components/auth/AuthShell";
import CodeInput from "@/components/auth/CodeInput";
import PasswordField, { INPUT } from "@/components/auth/PasswordField";
import { useI18n } from "@/lib/i18n/client";
import { safeNext } from "@/lib/safe-next";
import { SETUP_PATH } from "@/lib/two-step/policy";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"];
type Step = "password" | "code" | "recovery";
const ERR = "mb-4 rounded-lg border-[1.5px] border-[#8E2A12] bg-[#F6DDD3] p-3 font-body text-[0.94rem] font-bold text-[#8E2A12]";
const OK = "mb-4 rounded-lg border-[1.5px] border-canopy bg-canopy/10 p-3 font-body text-[0.94rem] font-bold text-canopy-deep";
const BTN = "flex min-h-[54px] w-full items-center justify-center rounded-full bg-rust font-body text-base font-extrabold text-white hover:bg-rust-deep disabled:opacity-60";
const LINKB = "inline-flex min-h-[44px] items-center font-bold text-rust-deep underline underline-offset-4";

function LoginForm() {
  const { tr, lp } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const resetDone = params.get("reset") === "1";
  const signedOutEverywhere = params.get("signedout") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<Step>("password");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const recoveryRef = useRef<HTMLInputElement>(null);

  // Where the person lands once signed in (as it always was), except that someone who still has to set up two-step goes there first.
  async function landed() {
    const session = await getSession();
    const role = session?.user?.role;
    if ((session?.user as { twoStepSetupRequired?: boolean } | undefined)?.twoStepSetupRequired) {
      router.push(`${SETUP_PATH}?required=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
    } else if (next) {
      router.push(next);
    } else if (role && ADMIN_ROLES.includes(role)) {
      router.push("/admin");
    } else if (role === "SELLER") {
      router.push("/partner");
    } else {
      router.push("/passport");
    }
    router.refresh();
  }

  async function attempt(withCode?: string) {
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, ...(withCode ? { code: withCode } : {}), redirect: false });
    setLoading(false);

    if (res?.error === "TwoStepRequired") { // the password was right; now the second step
      setCode(""); setRecovery(""); setStep("code");
      return;
    }
    if (res?.error) {
      setCode("");
      setError(
        res.error === "TooManyAttempts"
          ? tr("Too many attempts. Please wait a few minutes before trying again, or reset your password.")
          : res.error === "AccountSuspended"
            ? tr("This account has been suspended. Please contact us if you think that is a mistake.")
            : res.error === "InvalidCode"
              ? tr("That code isn't right. It changes every 30 seconds: wait for a fresh one and try again.")
              : res.error === "TwoStepUnavailable"
                ? tr("Two-step sign-in is not available right now. Please try again later, or contact us.")
                : tr("That email and password don't match. Check them and try again.")
      );
      if (step === "password") passwordRef.current?.focus(); // the cursor goes back to where the fix is
      else if (step === "recovery") recoveryRef.current?.focus();
      return;
    }
    await landed();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (step === "password") return void attempt();
    if (step === "code") { if (code.length < 6) { setError(tr("Type all 6 digits from your app.")); return; } return void attempt(code); }
    if (!recovery.trim()) { setError(tr("Type one of your recovery codes.")); return; }
    void attempt(recovery.trim());
  }
  const backToPassword = () => { setStep("password"); setCode(""); setRecovery(""); setError(""); };

  if (step !== "password") {
    return (
      <AuthShell headline={tr("A second key for the door.")} sub={tr("Your password and a code from your phone: both, every time.")}>
        <p className="mb-2 font-body text-[0.78rem] font-extrabold uppercase tracking-[0.14em] text-rust-deep">{tr("Step 2 of 2")}</p>
        <h1 className="font-display text-[clamp(1.9rem,4vw,2.5rem)] font-semibold leading-tight text-stone">{step === "code" ? tr("Check it's you") : tr("Use a recovery code")}</h1>
        <p className="mb-6 mt-2 font-body text-stone/80">{step === "code" ? tr("Open your authenticator app and type the 6-digit code it shows for Visit Taita.") : tr("Type one of the recovery codes you saved when you turned on two-step sign-in. Each code works once.")}</p>
        {error && <p id="login-error" role="alert" className={ERR}>{error}</p>}
        <form onSubmit={handleSubmit}>
          {step === "code" ? (
            <>
              <CodeInput id="code" label={tr("6-digit code")} value={code} onChange={setCode} onComplete={(c) => { if (!loading) void attempt(c); }} invalid={!!error} describedBy={error ? "login-error" : undefined} autoFocus />
              <p className="mb-5 mt-2 font-body text-[0.86rem] text-stone/80">{tr("The code changes every 30 seconds. You can paste it.")}</p>
            </>
          ) : (
            <div className="mb-5">
              <label htmlFor="recovery" className="mb-1.5 block font-body text-[0.92rem] font-bold text-stone">{tr("Recovery code")}</label>
              <input id="recovery" ref={recoveryRef} value={recovery} onChange={(e) => setRecovery(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="AAAA-1111" aria-invalid={error ? true : undefined} aria-describedby={error ? "login-error" : undefined} className={`${INPUT} font-mono tracking-[0.08em]`} autoFocus />
            </div>
          )}
          <button type="submit" disabled={loading} className={BTN}>{loading ? tr("Signing in…") : tr("Continue")}</button>
        </form>
        <p className="mt-6 font-body text-stone/80">
          {step === "code" ? <button type="button" className={LINKB} onClick={() => { setStep("recovery"); setError(""); }}>{tr("Lost your phone? Use a recovery code")}</button> : <button type="button" className={LINKB} onClick={() => { setStep("code"); setError(""); }}>{tr("Use my authenticator app instead")}</button>}
          <br />
          <button type="button" className={LINKB} onClick={backToPassword}>{"\u2190"} {tr("Back to sign in")}</button>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell headline={tr("Your stamps are waiting.")} sub={tr("Sign in to see your Passport, your bookings and your tickets.")}>
      <h1 className="font-display text-[clamp(1.9rem,4vw,2.5rem)] font-semibold leading-tight text-stone">{tr("Welcome back")}</h1>
      <p className="mb-6 mt-2 font-body text-stone/80">{tr("Sign in to your Visit Taita account.")}</p>

      {resetDone && !error && <p role="status" className={OK}>{tr("Your password has been changed. Sign in with the new one.")}</p>}
      {signedOutEverywhere && !error && <p role="status" className={OK}>{tr("You have been signed out of every device.")}</p>}
      {error && <p id="login-error" role="alert" className={ERR}>{error}</p>}

      <form onSubmit={handleSubmit} noValidate={false}>
        <div className="mb-5">
          <label htmlFor="email" className="mb-1.5 block font-body text-[0.92rem] font-bold text-stone">{tr("Email")}</label>
          <input id="email" name="email" type="email" required autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} aria-invalid={error ? true : undefined} aria-describedby={error ? "login-error" : undefined} value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
        </div>
        <PasswordField id="password" label={tr("Password")} value={password} onChange={setPassword} autoComplete="current-password" invalid={!!error} describedBy={error ? "login-error" : undefined} inputRef={passwordRef} />
        <p className="-mt-2 mb-5 text-right font-body">
          <Link href={lp("/forgot-password")} className={LINKB}>{tr("Forgot your password?")}</Link>
        </p>
        <button type="submit" disabled={loading} className={BTN}>
          {loading ? tr("Signing in…") : tr("Sign in")}
        </button>
      </form>

      <p className="mt-6 font-body text-stone/80">
        {tr("No Passport yet?")}{" "}
        <Link href={lp(next ? `/register?next=${encodeURIComponent(next)}` : "/register")} className={LINKB}>{tr("Create one")}</Link>
      </p>
    </AuthShell>
  );
}

// useSearchParams needs a Suspense boundary so the page can still be prerendered.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
