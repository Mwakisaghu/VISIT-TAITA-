"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import AuthShell from "@/components/auth/AuthShell";
import IssuedStamp from "@/components/auth/IssuedStamp";
import PassphraseSuggest from "@/components/auth/PassphraseSuggest";
import PasswordChecklist from "@/components/auth/PasswordChecklist";
import PasswordField, { INPUT } from "@/components/auth/PasswordField";
import { useI18n } from "@/lib/i18n/client";
import { checkPassword, type PasswordCheck } from "@/lib/password-policy";
import { passwordProblemText } from "@/lib/password-policy-text";
import { safeNext } from "@/lib/safe-next";

const LABEL = "mb-1.5 block font-body text-[0.92rem] font-bold text-stone";
type Refusal = { error?: string; code?: string; reason?: Exclude<PasswordCheck, { ok: true }>["reason"]; detail?: "variety" };

function RegisterForm() {
  const { tr, lp } = useI18n();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [issued, setIssued] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // What the server refused, said in the person's own language (by its code), with its English text as the fallback.
  const say = (d: Refusal): string =>
    d.code === "password" && d.reason ? passwordProblemText({ ok: false, reason: d.reason, detail: d.detail, message: d.error ?? "" }, tr)
    : d.code === "terms" ? tr("Please accept the Terms of Use and Privacy Policy to create an account.")
    : d.code === "rate_limited" ? tr("Too many sign-up attempts from this connection. Please try again in an hour.")
    : d.code === "exists" ? tr("An account with that email already exists. If it's yours, use 'Forgot your password?' on the sign-in page.")
    : d.error ?? tr("Something went wrong.");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const rules = checkPassword(password, { name, email }); // the same rules the server applies: tell them now, without a round trip
    if (!rules.ok) { setError(passwordProblemText(rules, tr)); passwordRef.current?.focus(); return; }
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, acceptTerms: accepted }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(say(data));
      setLoading(false);
      if (data.code === "password") passwordRef.current?.focus();
      return;
    }

    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (signInRes?.error) {
      router.push("/login");
      return;
    }
    setIssued(new Date().toISOString()); // the Passport is issued: show the stamp, then on to it
    router.refresh();
  }

  if (issued) {
    return (
      <AuthShell headline={tr("Welcome.")} sub={tr("Your Passport is ready.")}>
        <IssuedStamp issuedAt={issued} />
        <h1 className="font-display text-[clamp(1.9rem,4vw,2.5rem)] font-semibold leading-tight text-stone">{tr("Your Passport is issued")}</h1>
        <p className="mb-6 mt-2 font-body text-stone/80">{tr("Welcome, {name}. We've sent a link to {email}: open it to verify your address.", { name: name.trim().split(/\s+/)[0], email })}</p>
        <button type="button" onClick={() => router.push(next ?? "/passport")} className="flex min-h-[54px] w-full items-center justify-center rounded-full bg-rust font-body text-base font-extrabold text-white hover:bg-rust-deep">{tr("Open my Passport")}</button>
        <p className="mt-4 font-body text-sm text-stone/80">{tr("Your first stamp is already in the book: the day you joined.")}</p>
      </AuthShell>
    );
  }

  // The consent sentence has two links inside it, so it is translated as one sentence with markers where the links go (the word order can differ by language).
  const parts = tr("I'm 18 or over, I agree to the {terms} and I've read the {privacy}.", { terms: "{terms}", privacy: "{privacy}" }).split(/(\{terms\}|\{privacy\})/);
  const linkClass = "inline-block py-3 -my-3 px-0.5 font-bold text-rust-deep underline underline-offset-4"; // a bigger tap area, with no change to the layout

  return (
    <AuthShell headline={tr("Every place can leave a stamp.")} sub={tr("Start your Passport and collect the Taita Hills, one stamp at a time.")}>
      <h1 className="font-display text-[clamp(1.9rem,4vw,2.5rem)] font-semibold leading-tight text-stone">{tr("Start your Passport")}</h1>
      <p className="mb-6 mt-2 font-body text-stone/80">{tr("Track visits, earn badges, become a Taita Insider.")}</p>

      {error && <p id="register-error" role="alert" className="mb-4 rounded-lg border-[1.5px] border-[#8E2A12] bg-[#F6DDD3] p-3 font-body text-[0.94rem] font-bold text-[#8E2A12]">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="mb-5">
          <label htmlFor="name" className={LABEL}>{tr("Name")}</label>
          <input id="name" name="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
        </div>
        <div className="mb-5">
          <label htmlFor="email" className={LABEL}>{tr("Email")}</label>
          <input id="email" name="email" type="email" required autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
        </div>
        <PasswordField id="password" label={tr("Password")} value={password} onChange={setPassword} autoComplete="new-password" describedBy="password-checks password-tip" inputRef={passwordRef}>
          <PasswordChecklist id="password-checks" password={password} name={name} email={email} />
          <p id="password-tip" className="mt-2 font-body text-[0.86rem] text-stone/80">{tr("Longer is stronger: a phrase of a few unrelated words, in any language you like, makes a great password. Your browser may also offer to create one for you and save it: say yes.")}</p>
          <PassphraseSuggest id="passphrase" name={name} email={email} onUse={(p) => { setPassword(p); setTimeout(() => passwordRef.current?.focus(), 0); }} />
        </PasswordField>

        <label className="mb-5 flex items-start gap-3 font-body text-[0.94rem]">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required className="mt-0.5 h-6 w-6 flex-none accent-rust" />
          <span>{parts.map((p, i) => p === "{terms}" ? <Link key={i} href={lp("/terms")} target="_blank" className={linkClass}>{tr("Terms of Use")}</Link> : p === "{privacy}" ? <Link key={i} href={lp("/privacy")} target="_blank" className={linkClass}>{tr("Privacy Policy")}</Link> : <span key={i}>{p}</span>)}</span>
        </label>

        <button type="submit" disabled={loading} className="flex min-h-[54px] w-full items-center justify-center rounded-full bg-rust font-body text-base font-extrabold text-white hover:bg-rust-deep disabled:opacity-60">
          {loading ? tr("Creating…") : tr("Create my Passport")}
        </button>
      </form>

      <p className="mt-6 font-body text-stone/80">
        {tr("Already have one?")}{" "}
        <Link href={lp(next ? `/login?next=${encodeURIComponent(next)}` : "/login")} className="inline-flex min-h-[44px] items-center font-bold text-rust-deep underline underline-offset-4">{tr("Sign in")}</Link>
      </p>
    </AuthShell>
  );
}

// useSearchParams needs a Suspense boundary so the page can still be prerendered.
export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
