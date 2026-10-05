"use client";

import { useState } from "react";
import { confirmSubscription, unsubscribeWithToken } from "@/lib/actions/newsletter";

const COPY = {
  confirm: { button: "Yes, confirm my subscription", busy: "Confirming…", done: "You're confirmed — thank you! Karibu. Our next letter will come to you." },
  unsubscribe: { button: "Yes, unsubscribe me", busy: "Unsubscribing…", done: "You've been unsubscribed. We're sorry to see you go — you won't hear from us again unless you sign up again." },
} as const;

/** A button that does the confirm/unsubscribe. The page only ever SHOWS this; nothing happens on page load. */
export default function TokenActionForm({ mode, token }: { mode: "confirm" | "unsubscribe"; token: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = mode === "confirm" ? await confirmSubscription(token) : await unsubscribeWithToken(token);
      if (res.ok) setDone(true);
      else setError(res.error);
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p role="status" className="font-body text-lg text-stone/80">
        {COPY[mode].done}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="focus-ring w-fit rounded-full bg-rust px-8 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep disabled:opacity-60"
      >
        {busy ? COPY[mode].busy : COPY[mode].button}
      </button>
      {error && (
        <p role="alert" className="font-body text-sm text-rust">
          {error}
        </p>
      )}
    </div>
  );
}
