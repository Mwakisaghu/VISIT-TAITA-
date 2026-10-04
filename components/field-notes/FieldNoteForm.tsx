"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitFieldNote } from "@/lib/actions/field-notes";
import { NOTE_LIMITS as L } from "@/lib/field-notes";

export type FieldNoteDefaults = {
  title: string;
  answers: string[];
  body: string;
  photos: string;
  links: string;
};

export default function FieldNoteForm({
  missionId,
  prompts,
  disclosureLine,
  defaults,
  isRevision,
}: {
  missionId: string;
  prompts: string[];
  /** Present for hosted/sponsored missions — the creator must confirm they've disclosed it. */
  disclosureLine: string | null;
  defaults?: FieldNoteDefaults;
  isRevision: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await submitFieldNote(missionId, formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="rounded-sm border border-canopy/30 bg-canopy/10 p-6">
        <p className="font-display text-2xl text-stone">Thank you — your Field Note is in.</p>
        <p className="mt-2 font-body text-stone/70">We&apos;ll review it and email you at your account address. You can still edit it until it&apos;s published.</p>
      </div>
    );
  }

  const label = "font-body text-sm text-stone/70";

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <label className="flex flex-col gap-1">
        <span className={label}>Title</span>
        <input name="title" defaultValue={defaults?.title} required minLength={L.titleMin} maxLength={L.titleMax} className="input" />
      </label>

      {prompts.length > 0 && (
        <div className="flex flex-col gap-5">
          <p className="font-body text-sm text-stone/60">Show the evidence — specifics, not adjectives.</p>
          {prompts.map((p, i) => (
            <label key={`${i}-${p}`} className="flex flex-col gap-1">
              <span className="font-body text-sm font-semibold text-stone">{p}</span>
              <textarea
                name={`answer-${i}`}
                defaultValue={defaults?.answers[i] ?? ""}
                required
                minLength={L.answerMin}
                maxLength={L.answerMax}
                rows={3}
                className="input"
              />
              <span className="font-body text-xs text-stone/40">
                {L.answerMin}–{L.answerMax} characters
              </span>
            </label>
          ))}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className={label}>{prompts.length > 0 ? "The story (optional)" : `The story (at least ${L.bodyMinWithoutPrompts} characters)`}</span>
        <textarea name="body" defaultValue={defaults?.body} maxLength={L.bodyMax} rows={6} className="input" />
      </label>

      <label className="flex flex-col gap-1">
        <span className={label}>Photo links — one per line, up to {L.maxPhotos}</span>
        <textarea name="photos" defaultValue={defaults?.photos} rows={3} className="input" placeholder={"yourphotos.com/sagalla-1.jpg"} />
      </label>

      <label className="flex flex-col gap-1">
        <span className={label}>Links to your own posts about this — one per line, up to {L.maxLinks}</span>
        <textarea name="links" defaultValue={defaults?.links} rows={2} className="input" placeholder={"instagram.com/p/…"} />
        <span className="font-body text-xs text-stone/40">Add at least one photo link or one post link.</span>
      </label>

      {disclosureLine && (
        <label className="flex items-start gap-3 rounded-sm border border-ochre/50 bg-ochre/10 p-4 font-body text-sm text-stone/80">
          <input type="checkbox" name="disclosed" className="mt-1" required />
          <span>
            I&apos;ve disclosed this mission&apos;s support in my own posts. Suggested line: <strong className="select-all">{disclosureLine}</strong>
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="rounded-sm border border-rust/40 bg-rust/10 p-3 font-body text-sm text-stone">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="focus-ring w-fit rounded-full bg-rust px-8 py-3 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-60">
        {busy ? "Sending…" : isRevision ? "Resubmit Field Note" : "Submit Field Note"}
      </button>
    </form>
  );
}
