import type { CheckinResult } from "@/lib/actions/passport";

/** Shared success/error line shown after a check-in attempt. */
export default function CheckinResultMessage({ result }: { result: CheckinResult }) {
  if (result.error) {
    return (
      <p role="alert" className="font-body text-sm text-rust">
        {result.error}
      </p>
    );
  }

  return (
    <div role="status" className="font-body text-sm text-canopy">
      {result.alreadyCheckedIn ? (
        <p>You&apos;ve already checked in at {result.destinationName} — no extra points this time.</p>
      ) : (
        <p>
          Checked in at {result.destinationName}! <strong>+{result.pointsAwarded} points</strong>
        </p>
      )}
      {result.newBadges && result.newBadges.length > 0 && (
        <p className="mt-1 text-stone">New badge{result.newBadges.length > 1 ? "s" : ""}: {result.newBadges.join(", ")} 🎉</p>
      )}
    </div>
  );
}
