"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkInWithLocation, type CheckinResult } from "@/lib/actions/passport";
import CheckinResultMessage from "@/components/passport/CheckinResultMessage";

export default function LocationCheckinButton({ destinationId }: { destinationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);

  function checkIn() {
    setResult(null);

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setResult({ error: "Your browser can't share its location — scan the QR code at the site instead." });
      return;
    }

    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await checkInWithLocation(
            destinationId,
            position.coords.latitude,
            position.coords.longitude,
            position.coords.accuracy
          );
          setResult(res);
          if (res.success) router.refresh();
        } catch {
          setResult({ error: "Something went wrong checking you in — please try again." });
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setBusy(false);
        setResult({
          error:
            err.code === err.PERMISSION_DENIED
              ? "Location access was denied. Allow it in your browser settings, or scan the QR code at the site."
              : "We couldn't get your location. Try again outdoors, or scan the QR code at the site.",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={checkIn}
        disabled={busy}
        className="focus-ring rounded-full bg-rust px-4 py-2 font-body text-sm text-parchment transition-colors hover:bg-rust-deep disabled:opacity-60"
      >
        {busy ? "Locating…" : "Check in here"}
      </button>
      {result && (
        <div className="max-w-xs text-right">
          <CheckinResultMessage result={result} />
        </div>
      )}
    </div>
  );
}
