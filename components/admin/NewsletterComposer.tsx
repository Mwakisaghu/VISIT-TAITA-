"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCampaign, sendCampaign, sendTestNewsletter } from "@/lib/actions/newsletter-admin";
import { NEWSLETTER_LIMITS as L } from "@/lib/newsletter";

export default function NewsletterComposer({
  campaign,
  sendableCount,
  sendBlockReason,
}: {
  campaign?: { id: string; subject: string; body: string } | null;
  sendableCount: number;
  /** Why sending is currently impossible (not configured, test sender, non-public address) — or null if it's fine. */
  sendBlockReason: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [bodyLength, setBodyLength] = useState(campaign?.body.length ?? 0);

  function fields(form: HTMLFormElement) {
    return new FormData(form);
  }

  async function run(label: string, fn: () => Promise<{ error?: string; message?: string; success?: true; id?: string }>, after?: (r: { id?: string }) => void) {
    setBusy(label);
    setError("");
    setMessage("");
    try {
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        if (res.message) setMessage(res.message);
        after?.(res);
      }
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy("");
    }
  }

  async function save(form: HTMLFormElement) {
    await run("save", () => saveCampaign(campaign?.id ?? null, fields(form)), (r) => {
      setMessage("Draft saved.");
      router.push(r.id ? `/admin/newsletter?edit=${r.id}` : "/admin/newsletter");
      router.refresh();
    });
  }

  async function test(form: HTMLFormElement) {
    await run("test", () => sendTestNewsletter(fields(form)));
  }

  async function send(form: HTMLFormElement) {
    if (sendBlockReason || sendableCount === 0) return;
    if (!window.confirm(`Send this to ${sendableCount} confirmed subscriber${sendableCount === 1 ? "" : "s"} now? This can't be undone.`)) return;
    setBusy("send");
    setError("");
    setMessage("");
    try {
      // Save the latest text first, then send exactly what was saved.
      const saved = await saveCampaign(campaign?.id ?? null, fields(form));
      if (saved.error || !saved.id) {
        setError(saved.error ?? "Couldn't save the newsletter.");
        return;
      }
      const res = await sendCampaign(saved.id);
      if (res.error) setError(res.error);
      else {
        setMessage(res.message ?? "Sent.");
        router.push("/admin/newsletter");
        router.refresh();
      }
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy("");
    }
  }

  const btn = "focus-ring rounded-full border border-stone/25 px-5 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-60";

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex max-w-2xl flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-stone/70">Subject</span>
        <input name="subject" defaultValue={campaign?.subject} required maxLength={L.subjectMax} className="input" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-stone/70">Message (plain text)</span>
        <textarea
          name="body"
          defaultValue={campaign?.body}
          required
          rows={14}
          maxLength={L.bodyMax}
          onChange={(e) => setBodyLength(e.currentTarget.value.length)}
          className="input font-mono text-sm"
        />
        <span className="font-body text-xs text-stone/40">
          {bodyLength.toLocaleString("en-GB")} / {L.bodyMax.toLocaleString("en-GB")}. Web addresses become links in most mail apps. A footer with the unsubscribe link and your name is added automatically.
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-sm border border-rust/40 bg-rust/10 p-3 font-body text-sm text-stone">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="font-body text-sm text-canopy">
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={!!busy} onClick={(e) => void save(e.currentTarget.form!)} className={btn}>
          {busy === "save" ? "Saving…" : "Save draft"}
        </button>
        <button type="button" disabled={!!busy} onClick={(e) => void test(e.currentTarget.form!)} className={btn}>
          {busy === "test" ? "Sending…" : "Send me a test"}
        </button>
        <button
          type="button"
          disabled={!!busy || !!sendBlockReason || sendableCount === 0}
          onClick={(e) => void send(e.currentTarget.form!)}
          className="focus-ring rounded-full bg-rust px-6 py-2 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-50"
        >
          {busy === "send" ? "Sending…" : `Send to ${sendableCount} subscriber${sendableCount === 1 ? "" : "s"}`}
        </button>
      </div>
      {sendBlockReason && <p className="font-body text-xs text-rust">{sendBlockReason}</p>}
      {!sendBlockReason && sendableCount === 0 && <p className="font-body text-xs text-stone/50">There are no confirmed subscribers yet, so there is no one to send to.</p>}
    </form>
  );
}
