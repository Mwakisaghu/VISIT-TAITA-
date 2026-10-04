"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSponsorReportLink } from "@/lib/actions/impact-admin";

export default function ReportLinkControls({
  sponsorId,
  url,
  shareable,
}: {
  sponsorId: string;
  /** The full link, or null when none exists. */
  url: string | null;
  /** False when the site's public address isn't set (a localhost link couldn't be opened by a sponsor). */
  shareable: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(action: "enable" | "rotate" | "disable") {
    setError("");
    startTransition(async () => {
      try {
        const res = await setSponsorReportLink(sponsorId, action);
        if (res.error) setError(res.error);
        else router.refresh();
      } catch {
        setError("Something went wrong — please try again.");
      }
    });
  }

  const btn = "focus-ring rounded-full border border-stone/25 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-60";

  return (
    <div className="rounded-sm border border-stone/15 p-5 print:hidden">
      <p className="font-display text-lg text-stone">Shareable link</p>
      {url ? (
        <>
          <p className="mt-1 font-body text-sm text-stone/70">Anyone with this link can see this sponsor&apos;s report — and nothing else.</p>
          <input readOnly value={url} aria-label="Report link" onFocus={(e) => e.currentTarget.select()} className="input mt-3 select-all" />
          {!shareable && (
            <p className="mt-2 font-body text-xs text-rust">
              NEXT_PUBLIC_APP_URL isn&apos;t set to your public address, so this link only works on this machine. Set it before sharing.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={isPending} onClick={() => run("rotate")} className={btn}>
              Replace link (old one stops working)
            </button>
            <button type="button" disabled={isPending} onClick={() => run("disable")} className={btn}>
              Turn off
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 font-body text-sm text-stone/70">There&apos;s no link yet. Create one to send this report to the sponsor.</p>
          <button type="button" disabled={isPending} onClick={() => run("enable")} className={`${btn} mt-3`}>
            Create link
          </button>
        </>
      )}
      {error && <p className="mt-3 font-body text-xs text-rust">{error}</p>}
    </div>
  );
}
