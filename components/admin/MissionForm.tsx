"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Mission } from "@prisma/client";
import { saveMission } from "@/lib/actions/missions-admin";
import { CREATOR_TRACKS, TRACK_LABELS } from "@/lib/creators";
import {
  MISSION_LIMITS as L,
  MISSION_STATUSES,
  MISSION_STATUS_LABELS,
  MISSION_SUPPORTS,
  MISSION_SUPPORT_HELP,
  MISSION_SUPPORT_LABELS,
} from "@/lib/missions";

type DestinationOption = { id: string; name: string; status: string; hasCheckin: boolean };
type SponsorOption = { id: string; name: string };
type ListingOption = { id: string; name: string; status: string };

export default function MissionForm({
  mission,
  destinations,
  sponsors,
  stays = [],
  experiences = [],
}: {
  mission?: Mission;
  destinations: DestinationOption[];
  sponsors: SponsorOption[];
  stays?: ListingOption[];
  experiences?: ListingOption[];
}) {
  const router = useRouter();
  const [support, setSupport] = useState<string>(mission?.support ?? "NONE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await saveMission(mission?.id ?? null, formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/admin/missions");
      router.refresh();
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const label = "font-body text-sm text-stone/70";

  return (
    <form onSubmit={submit} className="mt-8 flex max-w-2xl flex-col gap-5">
      <label className="flex flex-col gap-1">
        <span className={label}>Title</span>
        <input name="title" defaultValue={mission?.title} required maxLength={L.titleMax} className="input" />
      </label>

      <label className="flex flex-col gap-1">
        <span className={label}>One-line summary</span>
        <input name="summary" defaultValue={mission?.summary} required maxLength={L.summaryMax} className="input" />
      </label>

      <label className="flex flex-col gap-1">
        <span className={label}>The brief</span>
        <textarea name="brief" defaultValue={mission?.brief} required minLength={L.briefMin} maxLength={L.briefMax} rows={6} className="input" />
        <span className="font-body text-xs text-stone/40">Describe the place and the story. Ask for evidence — don&apos;t script how the creator should feel.</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={label}>Campaign (optional)</span>
          <input name="campaign" defaultValue={mission?.campaign ?? ""} maxLength={L.campaignMax} className="input" placeholder="e.g. 48 Hours in Taita" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Image URL (optional)</span>
          <input name="image" type="url" defaultValue={mission?.image ?? ""} className="input" placeholder="https://" />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className={label}>Destination (where the note is verified)</span>
        <select name="destinationId" defaultValue={mission?.destinationId ?? ""} required className="input">
          <option value="">— Choose a destination —</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {d.status !== "PUBLISHED" ? " (unpublished)" : !d.hasCheckin ? " (no check-in set up)" : ""}
            </option>
          ))}
        </select>
        <span className="font-body text-xs text-stone/40">To open a mission its destination must be published and have a QR code or coordinates.</span>
      </label>

      <fieldset className="rounded-sm border border-stone/15 p-4">
        <legend className="px-1 font-body text-sm text-stone/70">Feature a listing (optional)</legend>
        <p className="font-body text-xs text-stone/50">
          Shown as &quot;Plan your own visit&quot; on the mission and its Field Notes. Enquiries sent from those links are counted for this mission.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={label}>A stay</span>
            <select name="accommodationId" defaultValue={mission?.accommodationId ?? ""} className="input">
              <option value="">— None —</option>
              {stays.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.status !== "PUBLISHED" ? " (unpublished)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>An experience</span>
            <select name="experienceId" defaultValue={mission?.experienceId ?? ""} className="input">
              <option value="">— None —</option>
              {experiences.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                  {x.status !== "PUBLISHED" ? " (unpublished)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className={label}>Open to</span>
        <select name="track" defaultValue={mission?.track ?? ""} className="input">
          <option value="">Everyone in the crew</option>
          {CREATOR_TRACKS.map((t) => (
            <option key={t} value={t}>
              {TRACK_LABELS[t]}s only
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={label}>Evidence prompts — one per line (up to {L.maxPrompts})</span>
        <textarea
          name="prompts"
          defaultValue={mission?.prompts.join("\n")}
          rows={5}
          className="input"
          placeholder={"What it costs\nHow long it takes\nHow to get there\nOne honest caveat"}
        />
      </label>

      <fieldset className="rounded-sm border border-stone/15 p-4">
        <legend className="px-1 font-body text-sm text-stone/70">Who supports this mission?</legend>
        <div className="mt-2 flex flex-col gap-2">
          {MISSION_SUPPORTS.map((s) => (
            <label key={s} className="flex items-start gap-2 font-body text-sm text-stone/80">
              <input type="radio" name="support" value={s} checked={support === s} onChange={() => setSupport(s)} className="mt-1" />
              <span>
                <strong className="text-stone">{MISSION_SUPPORT_LABELS[s]}</strong> — {MISSION_SUPPORT_HELP[s]}
              </span>
            </label>
          ))}
        </div>

        {support === "HOSTED" && (
          <label className="mt-4 flex flex-col gap-1">
            <span className={label}>Hosted by</span>
            <input name="hostName" defaultValue={mission?.hostName ?? ""} maxLength={L.hostNameMax} className="input" placeholder="e.g. Dawida Hill Lodge" />
          </label>
        )}
        {support === "SPONSORED" && (
          <label className="mt-4 flex flex-col gap-1">
            <span className={label}>Sponsor</span>
            <select name="sponsorId" defaultValue={mission?.sponsorId ?? ""} className="input">
              <option value="">— Choose a sponsor —</option>
              {sponsors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {support !== "NONE" && (
          <label className="mt-4 flex flex-col gap-1">
            <span className={label}>What is provided?</span>
            <input name="supportNote" defaultValue={mission?.supportNote ?? ""} maxLength={L.supportNoteMax} className="input" placeholder="e.g. Two nights and meals" />
            <span className="font-body text-xs text-stone/40">Creators disclose this in every post, and we show it on the mission page.</span>
          </label>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className={label}>Reward points</span>
          <input name="rewardPoints" type="number" min={0} max={L.rewardPointsMax} defaultValue={mission?.rewardPoints ?? 0} className="input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Spots (blank = unlimited)</span>
          <input name="maxCreators" type="number" min={1} max={L.maxCreatorsMax} defaultValue={mission?.maxCreators ?? ""} className="input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Closes (optional)</span>
          <input name="closesAt" type="date" defaultValue={mission?.closesAt ? mission.closesAt.toISOString().slice(0, 10) : ""} className="input" />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className={label}>Status</span>
        <select name="status" defaultValue={mission?.status ?? "DRAFT"} className="input">
          {MISSION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {MISSION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p role="alert" className="rounded-sm border border-rust/40 bg-rust/10 p-3 font-body text-sm text-stone">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="focus-ring w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-60"
      >
        {busy ? "Saving…" : mission ? "Save changes" : "Create mission"}
      </button>
    </form>
  );
}
