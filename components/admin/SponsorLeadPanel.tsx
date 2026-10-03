"use client";

import { useState, useTransition } from "react";
import { updateSponsorLead } from "@/lib/actions/sponsors";
import { SPONSOR_LEAD_STATUSES, sponsorLeadStatusLabel } from "@/lib/sponsors";

export default function SponsorLeadPanel({
  leadId,
  status,
  adminNotes,
}: {
  leadId: string;
  status: string;
  adminNotes: string | null;
}) {
  const [savedStatus, setSavedStatus] = useState(status);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [notes, setNotes] = useState(adminNotes ?? "");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(nextStatus: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await updateSponsorLead(leadId, nextStatus, notes);
        if (result.error) {
          setCurrentStatus(savedStatus); // roll back
          setMessage({ kind: "error", text: result.error });
          return;
        }
        setSavedStatus(nextStatus);
        setMessage({ kind: "ok", text: "Saved." });
      } catch {
        setCurrentStatus(savedStatus);
        setMessage({ kind: "error", text: "Couldn't save — please try again." });
      }
    });
  }

  return (
    <div className="mt-8 flex max-w-xl flex-col gap-6">
      <div>
        <p className="font-body text-sm text-stone/70">Pipeline status</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SPONSOR_LEAD_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={isPending}
              onClick={() => {
                setCurrentStatus(s);
                save(s);
              }}
              className={`focus-ring rounded-full border px-4 py-2 font-body text-sm transition-colors disabled:opacity-60 ${
                currentStatus === s
                  ? "border-rust bg-rust text-parchment"
                  : "border-stone/20 text-stone hover:border-rust hover:text-rust"
              }`}
            >
              {sponsorLeadStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-body text-sm text-stone/70">Internal notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          maxLength={4000}
          className="input"
          placeholder="Call notes, proposal links, next steps…"
        />
      </label>

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={isPending}
          onClick={() => save(currentStatus)}
          className="focus-ring rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save notes"}
        </button>
        {message && (
          <p className={`font-body text-sm ${message.kind === "ok" ? "text-canopy" : "text-rust"}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
