"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveShortLink } from "@/lib/actions/qr-admin";

const label = "font-body text-sm text-stone/70";

export default function ShortLinkForm({ link }: { link?: { id: string; slug: string; label: string; target: string; active: boolean } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true); setError(""); setMessage("");
    try {
      const res = await saveShortLink(link?.id ?? null, new FormData(form));
      if (res.error) return setError(res.error);
      setMessage(res.message ?? "Saved.");
      if (!link) { form.reset(); if (res.id) return router.push(`/admin/qr/${res.id}`); }
      router.refresh();
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-4">
      {!link && (
        <label className="flex flex-col gap-1">
          <span className={label}>Short address — permanent once printed</span>
          <span className="flex items-center gap-1 font-body text-sm text-stone/60">
            /go/<input name="slug" required maxLength={30} pattern="[a-z0-9]([a-z0-9\-]{0,28}[a-z0-9])?" placeholder="hills" className="input flex-1" />
          </span>
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className={label}>Name (so you can recognise it)</span>
        <input name="label" required minLength={2} maxLength={80} defaultValue={link?.label} className="input" />
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Where it goes — a page like /discover, or a full https:// address</span>
        <input name="target" required maxLength={300} defaultValue={link?.target} placeholder="/discover" className="input" />
      </label>
      {link && (
        <label className="flex items-center gap-2 font-body text-sm text-stone">
          <input type="checkbox" name="active" defaultChecked={link.active} /> Switched on (off sends scanners to the home page)
        </label>
      )}
      {error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}
      {message && <p role="status" className="font-body text-sm text-canopy">{message}</p>}
      <button type="submit" disabled={busy} className="focus-ring w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-50">
        {busy ? "Saving…" : link ? "Save changes" : "Create link"}
      </button>
    </form>
  );
}
