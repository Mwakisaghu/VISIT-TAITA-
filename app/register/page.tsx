"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (signInRes?.error) {
      router.push("/login");
      return;
    }
    router.push("/passport");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col px-6 py-24">
      <h1 className="font-display text-3xl text-stone">Start your Passport</h1>
      <p className="mt-2 font-body text-sm text-stone/60">
        Track visits, earn badges, become a Taita Insider.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="font-body text-sm text-stone/70">
            Name
          </label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="focus-ring mt-1 w-full rounded-sm border border-stone/20 bg-transparent px-4 py-2 font-body text-sm"
          />
        </div>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-ring mt-1 w-full rounded-sm border border-stone/20 bg-transparent px-4 py-2 font-body text-sm"
          />
          <p className="mt-1 font-body text-xs text-stone/50">At least 8 characters.</p>
        </div>

        {error && <p className="font-body text-sm text-rust">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="focus-ring mt-2 rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep disabled:opacity-60"
        >
          {loading ? "Creating your Passport…" : "Create my Passport"}
        </button>
      </form>

      <p className="mt-6 font-body text-sm text-stone/60">
        Already have one?{" "}
        <Link href="/login" className="text-rust hover:text-rust-deep">
          Sign in
        </Link>
      </p>
    </div>
  );
}
