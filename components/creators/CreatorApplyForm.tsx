"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitCreatorApplication } from "@/lib/actions/creators";
import {
  CREATOR_LIMITS as L,
  CREATOR_SPECIALTIES,
  CREATOR_TRACKS,
  SPECIALTY_LABELS,
  TRACK_BLURBS,
  TRACK_LABELS,
} from "@/lib/creators";

export default function CreatorApplyForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [track, setTrack] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await submitCreatorApplication(formData);
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
        <p className="font-display text-2xl text-stone">Thank you — your application is in.</p>
        <p className="mt-2 font-body text-stone/70">
          We read every one. You'll get an email at your account address once we've decided.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <fieldset>
        <legend className="font-body text-sm text-stone/70">Which track fits you?</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {CREATOR_TRACKS.map((t) => (
            <label
              key={t}
              className={`flex cursor-pointer flex-col gap-1 rounded-sm border p-4 transition-colors ${
                track === t ? "border-rust bg-rust/5" : "border-stone/15 hover:border-stone/40"
              }`}
            >
              <span className="flex items-center gap-2 font-display text-lg text-stone">
                <input type="radio" name="track" value={t} checked={track === t} onChange={() => setTrack(t)} required />
                {TRACK_LABELS[t]}
              </span>
              <span className="font-body text-xs leading-relaxed text-stone/60">{TRACK_BLURBS[t]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-stone/70">Public name</span>
          <input name="displayName" defaultValue={defaultName} required minLength={L.nameMin} maxLength={L.nameMax} className="input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-stone/70">Where are you based? (optional)</span>
          <input name="location" maxLength={L.locationMax} className="input" placeholder="e.g. Wundanyi, or Nairobi" />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-stone/70">Short bio — shown on your public profile</span>
        <textarea name="bio" required minLength={L.bioMin} maxLength={L.bioMax} rows={4} className="input" />
        <span className="font-body text-xs text-stone/40">
          {L.bioMin}–{L.bioMax} characters
        </span>
      </label>

      <fieldset>
        <legend className="font-body text-sm text-stone/70">What do you create?</legend>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {CREATOR_SPECIALTIES.map((s) => (
            <label key={s} className="flex items-center gap-2 font-body text-sm text-stone/80">
              <input type="checkbox" name="specialties" value={s} />
              {SPECIALTY_LABELS[s]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-stone/70">
          Links to your work — one per line, up to {L.maxLinks}
          {track === "LOCAL_VOICE" ? " (optional for Local Voices)" : ""}
        </span>
        <textarea name="portfolioLinks" rows={3} className="input" placeholder={"yourportfolio.com\ninstagram.com/you"} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-stone/70">Why Taita — and a story you'd tell</span>
        <textarea name="pitch" required minLength={L.pitchMin} maxLength={L.pitchMax} rows={5} className="input" />
        <span className="font-body text-xs text-stone/40">
          {L.pitchMin}–{L.pitchMax} characters
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-stone/70">Audience size, if relevant (optional)</span>
        <input name="followerNote" maxLength={L.followerNoteMax} className="input" placeholder="e.g. ~8k on Instagram" />
        <span className="font-body text-xs text-stone/40">Only our team sees this — it&apos;s never shown publicly.</span>
      </label>

      <label className="flex items-start gap-3 font-body text-sm text-stone/80">
        <input type="checkbox" name="agree" className="mt-1" required />
        <span>I&apos;ve read the creator guidelines above and agree to follow them, including disclosing hosted or sponsored content.</span>
      </label>

      {error && (
        <p role="alert" className="font-body text-sm text-rust">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="focus-ring w-fit rounded-full bg-rust px-8 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep disabled:opacity-60"
      >
        {busy ? "Sending…" : "Apply to the Field Crew"}
      </button>
    </form>
  );
}
