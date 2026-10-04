import { formatNoteDate, methodLabel } from "@/lib/field-notes";

/** The trust mark: the creator passed a QR/GPS check-in at this place, after taking the mission. */
export default function VerifiedBadge({
  place,
  at,
  method,
  compact = false,
}: {
  place: string;
  at: Date;
  method: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 font-body text-xs text-canopy">
        <span aria-hidden="true">✓</span> Verified on location
      </span>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-sm border border-canopy/30 bg-canopy/10 p-4">
      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canopy font-body text-parchment">
        ✓
      </span>
      <div>
        <p className="font-body text-sm font-semibold text-stone">Verified on location</p>
        <p className="font-body text-sm text-stone/70">
          Checked in at {place} on {formatNoteDate(at)} using {methodLabel(method) === "GPS" ? "GPS" : "the QR code on site"}.
        </p>
      </div>
    </div>
  );
}
