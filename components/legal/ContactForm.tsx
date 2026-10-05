"use client";

import { useState } from "react";
import ConsentNote from "@/components/legal/ConsentNote";
import { submitContactMessage } from "@/lib/actions/contact";
import { CONTACT_LIMITS as L, CONTACT_TOPICS } from "@/lib/contact";

export default function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await submitContactMessage(formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="rounded-sm border border-canopy/30 bg-canopy/10 p-6">
        <p className="font-display text-2xl text-stone">Thank you — your message is on its way.</p>
        <p className="mt-2 font-body text-stone/70">We&apos;ll reply to the email address you gave.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-stone/70">Your name</span>
          <input name="name" required minLength={L.nameMin} maxLength={L.nameMax} autoComplete="name" className="input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-stone/70">Your email</span>
          <input name="email" type="email" required autoComplete="email" className="input" />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-stone/70">What is it about?</span>
        <select name="topic" defaultValue="GENERAL" className="input">
          {CONTACT_TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-stone/70">Your message</span>
        <textarea name="message" required minLength={L.messageMin} maxLength={L.messageMax} rows={6} className="input" />
      </label>

      {error && (
        <p role="alert" className="font-body text-sm text-rust">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="focus-ring w-fit rounded-full bg-rust px-8 py-3 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send message"}
      </button>
      <ConsentNote kind="contact" />
    </form>
  );
}
