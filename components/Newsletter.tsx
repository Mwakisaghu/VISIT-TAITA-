"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="newsletter" className="bg-canopy px-6 py-20 text-parchment">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="font-display text-3xl sm:text-4xl">Taita is calling.</h2>
        <p className="mt-3 font-body text-parchment/80">
          Stories, events and new experiences from Taita, in your inbox once a
          month. No noise.
        </p>

        {status === "done" ? (
          <p className="mt-8 font-body text-ochre">You&apos;re on the list. Karibu.</p>
        ) : (
          <form
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
            onSubmit={handleSubmit}
          >
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="focus-ring w-full rounded-full border border-parchment/30 bg-transparent px-5 py-3 font-body text-sm text-parchment placeholder:text-parchment/50 sm:w-72"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="focus-ring rounded-full bg-ochre px-6 py-3 font-body text-sm text-stone transition-colors hover:bg-parchment disabled:opacity-60"
            >
              {status === "loading" ? "Joining…" : "Join the letter"}
            </button>
          </form>
        )}
        {status === "error" && (
          <p className="mt-4 font-body text-sm text-parchment/70">
            Something went wrong — please try again.
          </p>
        )}
      </div>
    </section>
  );
}
