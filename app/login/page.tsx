"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import AuthShell from "@/components/auth/AuthShell";
import PasswordField, { INPUT } from "@/components/auth/PasswordField";
import { useI18n } from "@/lib/i18n/client";
import { safeNext } from "@/lib/safe-next";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"];

function LoginForm() {
  const { tr, lp } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const resetDone = params.get("reset") === "1";
  const signedOutEverywhere = params.get("signedout") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError(
        res.error === "TooManyAttempts"
          ? tr("Too many attempts. Please wait a few minutes before trying again, or reset your password.")
          : res.error === "AccountSuspended"
            ? tr("This account has been suspended. Please contact us if you think that is a mistake.")
            : tr("That email and password don't match. Check them and try again.")
      );
      passwordRef.current?.focus(); // the cursor goes back to where the fix is
      return;
    }

    const session = await getSession();
    const role = session?.user?.role;

    if (next) {
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

  return (
    <AuthShell headline={tr("Your stamps are waiting.")} sub={tr("Sign in to see your Passport, your bookings and your tickets.")}>
      <h1 className="font-display text-[clamp(1.9rem,4vw,2.5rem)] font-semibold leading-tight text-stone">{tr("Welcome back")}</h1>
      <p className="mb-6 mt-2 font-body text-stone/80">{tr("Sign in to your Visit Taita account.")}</p>

      {resetDone && !error && <p role="status" className="mb-4 rounded-lg border-[1.5px] border-canopy bg-canopy/10 p-3 font-body text-[0.94rem] font-bold text-canopy-deep">{tr("Your password has been changed. Sign in with the new one.")}</p>}
      {signedOutEverywhere && !error && <p role="status" className="mb-4 rounded-lg border-[1.5px] border-canopy bg-canopy/10 p-3 font-body text-[0.94rem] font-bold text-canopy-deep">{tr("You have been signed out of every device.")}</p>}
      {error && <p id="login-error" role="alert" className="mb-4 rounded-lg border-[1.5px] border-[#8E2A12] bg-[#F6DDD3] p-3 font-body text-[0.94rem] font-bold text-[#8E2A12]">{error}</p>}

      <form onSubmit={handleSubmit} noValidate={false}>
        <div className="mb-5">
          <label htmlFor="email" className="mb-1.5 block font-body text-[0.92rem] font-bold text-stone">{tr("Email")}</label>
          <input id="email" name="email" type="email" required autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} aria-invalid={error ? true : undefined} aria-describedby={error ? "login-error" : undefined} value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
        </div>
        <PasswordField id="password" label={tr("Password")} value={password} onChange={setPassword} autoComplete="current-password" invalid={!!error} describedBy={error ? "login-error" : undefined} inputRef={passwordRef} />
        <p className="-mt-2 mb-5 text-right font-body">
          <Link href={lp("/forgot-password")} className="inline-flex min-h-[44px] items-center font-bold text-rust-deep underline underline-offset-4">{tr("Forgot your password?")}</Link>
        </p>
        <button type="submit" disabled={loading} className="flex min-h-[54px] w-full items-center justify-center rounded-full bg-rust font-body text-base font-extrabold text-white hover:bg-rust-deep disabled:opacity-60">
          {loading ? tr("Signing in…") : tr("Sign in")}
        </button>
      </form>

      <p className="mt-6 font-body text-stone/80">
        {tr("No Passport yet?")}{" "}
        <Link href={lp(next ? `/register?next=${encodeURIComponent(next)}` : "/register")} className="inline-flex min-h-[44px] items-center font-bold text-rust-deep underline underline-offset-4">{tr("Create one")}</Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
