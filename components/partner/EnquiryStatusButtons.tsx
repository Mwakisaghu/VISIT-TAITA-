"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEnquiryStatus } from "@/lib/actions/partner-enquiries";

type Next = { to: string; label: string; primary?: boolean };

// What a host can do next from each state. Everything is reversible, so a mis-click is never a problem.
const ACTIONS: Record<string, Next[]> = {
  NEW: [{ to: "CONTACTED", label: "Mark contacted", primary: true }, { to: "CONFIRMED", label: "Confirm" }, { to: "DECLINED", label: "Decline" }],
  CONTACTED: [{ to: "CONFIRMED", label: "Confirm", primary: true }, { to: "DECLINED", label: "Decline" }, { to: "NEW", label: "Back to new" }],
  CONFIRMED: [{ to: "CONTACTED", label: "Back to contacted" }],
  DECLINED: [{ to: "CONTACTED", label: "Reopen" }],
};

export default function EnquiryStatusButtons({ kind, id, status }: { kind: "stay" | "experience"; id: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function change(to: string) {
    setError("");
    startTransition(async () => {
      try {
        const res = await setEnquiryStatus(kind, id, to);
        if (res.error) setError(res.error);
        else router.refresh();
      } catch {
        setError("Something went wrong — please try again.");
      }
    });
  }

  const base = "focus-ring rounded-full px-4 py-1.5 font-body text-sm transition-colors disabled:opacity-60";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {(ACTIONS[status] ?? []).map((a) => (
          <button
            key={a.to}
            type="button"
            disabled={isPending}
            onClick={() => change(a.to)}
            className={a.primary ? `${base} bg-rust text-parchment hover:bg-rust-deep` : `${base} border border-stone/25 text-stone hover:border-rust hover:text-rust`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {status !== "CONFIRMED" && (
        <p className="max-w-md font-body text-xs text-stone/50">
          Confirming means you&apos;ve agreed this with the guest. It lets them leave a verified review, and counts in the reports we share with sponsors.
        </p>
      )}
      {error && (
        <p role="alert" className="font-body text-xs text-rust">
          {error}
        </p>
      )}
    </div>
  );
}
