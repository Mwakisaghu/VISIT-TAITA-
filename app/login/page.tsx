"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import { safeNext } from "@/lib/safe-next";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const resetDone = params.get("reset") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
          ? "Too many attempts. Please wait a few minutes before trying again, or reset your password."
          : res.error === "AccountSuspended"
            ? "This account has been suspended. Please contact us if you think that is a mistake."
            : "That email and password don't match an account."
      );
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
    <div className="mx-auto flex max-w-sm flex-col px-6 py-24">
      <h1 className="font-display text-3xl text-stone">Sign in</h1>
      <p className="mt-2 font-body text-sm text-stone/60">
        Sign in to your Visit Taita account.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="font-body text-sm text-stone/70">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="focus-ring mt-1 w-full rounded-sm border border-stone/20 bg-transparent px-4 py-2 font-body text-sm"
          />
        </div>
        <div>
          <label htmlFor="password" className="font-body text-sm text-stone/70">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-ring mt-1 w-full rounded-sm border border-stone/20 bg-transparent px-4 py-2 font-body text-sm"
          />
        </div>

        {resetDone && !error && <p className="font-body text-sm text-canopy">Your password has been changed. Sign in with the new one.</p>}

        {error && <p className="font-body text-sm text-rust">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="focus-ring mt-2 rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 font-body text-sm text-stone/60">
        <Link href="/forgot-password" className="text-rust hover:text-rust-deep">
          Forgot your password?
        </Link>
      </p>

      <p className="mt-6 font-body text-sm text-stone/60">
        No Passport yet?{" "}
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
          className="text-rust hover:text-rust-deep"
        >
          Create one
        </Link>
      </p>
    </div>
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
