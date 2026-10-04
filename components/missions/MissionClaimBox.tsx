"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { claimMission, getMyMissionState, withdrawClaim, type MyMissionState } from "@/lib/actions/missions";

/**
 * The visitor's own part of a mission page. It loads their state on the client
 * so the mission page itself can stay cached for everyone.
 */
export default function MissionClaimBox({ missionId, missionTitle }: { missionId: string; missionTitle: string }) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [state, setState] = useState<MyMissionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    getMyMissionState(missionId)
      .then((s) => !cancelled && setState(s))
      .catch(() => !cancelled && setState({ state: "unavailable", message: "Something went wrong — please refresh." }));
    return () => {
      cancelled = true;
    };
  }, [status, missionId]);

  async function run(fn: () => Promise<{ error?: string }>, next: MyMissionState["state"]) {
    setBusy(true);
    setError("");
    try {
      const res = await fn();
      if (res.error) {
        setError(res.error);
        return;
      }
      setState({ state: next });
      router.refresh();
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const box = "rounded-sm border border-stone/10 p-5";
  const primary =
    "focus-ring rounded-full bg-rust px-6 py-2.5 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-60";

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <div className={box}>
        <p className="font-display text-lg text-stone">Want to take this on?</p>
        <p className="mt-1 font-body text-sm text-stone/70">Sign in to claim a spot on {missionTitle}.</p>
        <Link href={`/login?next=${encodeURIComponent(pathname ?? "/")}`} className={`${primary} mt-4 inline-block`}>
          Sign in
        </Link>
      </div>
    );
  }

  if (!state) return <p className="font-body text-sm text-stone/40">Loading…</p>;

  if (state.state === "not-creator") {
    return (
      <div className={box}>
        <p className="font-display text-lg text-stone">Missions are for the Field Crew</p>
        <p className="mt-1 font-body text-sm text-stone/70">Join the crew to claim missions like this one.</p>
        <Link href="/creators/apply" className={`${primary} mt-4 inline-block`}>
          Apply to join
        </Link>
      </div>
    );
  }

  if (state.state === "paused") {
    return (
      <div className={box}>
        <p className="font-body text-sm text-stone/70">Your Field Crew profile is paused, so you can&apos;t claim missions right now.</p>
      </div>
    );
  }

  if (state.state === "ineligible" || state.state === "unavailable") {
    return (
      <div className={box}>
        <p className="font-body text-sm text-stone/70">{state.message}</p>
      </div>
    );
  }

  if (state.state === "claimed") {
    return (
      <div className={box}>
        <p className="font-display text-lg text-canopy">You&apos;re on this mission ✓</p>
        <p className="mt-1 font-body text-sm text-stone/70">Everything you need — including your disclosure line — is on your crew page.</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Link href="/crew" className={primary}>
            Go to my crew page
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Give this spot back?")) void run(() => withdrawClaim(missionId), "available");
            }}
            className="focus-ring font-body text-sm text-stone/50 hover:text-rust disabled:opacity-60"
          >
            Withdraw
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-3 font-body text-sm text-rust">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={box}>
      <p className="font-display text-lg text-stone">Claim a spot</p>
      <p className="mt-1 font-body text-sm text-stone/70">Claiming holds a place for you. You can give it back any time before you file.</p>
      <button type="button" disabled={busy} onClick={() => void run(() => claimMission(missionId), "claimed")} className={`${primary} mt-4`}>
        {busy ? "Claiming…" : "Claim this mission"}
      </button>
      {error && (
        <p role="alert" className="mt-3 font-body text-sm text-rust">
          {error}
        </p>
      )}
    </div>
  );
}
