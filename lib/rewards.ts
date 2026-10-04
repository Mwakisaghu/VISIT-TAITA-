// Pure helpers for the rewards system (no Node-only imports, so safe anywhere).

export const REDEMPTION_STATUSES = ["ISSUED", "USED", "CANCELLED"] as const;
export type RedemptionStatusValue = (typeof REDEMPTION_STATUSES)[number];

const STATUS_LABELS: Record<RedemptionStatusValue, string> = {
  ISSUED: "Ready to use",
  USED: "Used",
  CANCELLED: "Cancelled",
};

export function redemptionStatusLabel(status: string) {
  return STATUS_LABELS[status as RedemptionStatusValue] ?? status;
}

/** A reward can be redeemed if it's published, in stock, and not past its end date. */
export function isRedeemable(
  reward: { status: string; stock: number | null; validUntil: Date | null },
  now: Date = new Date()
) {
  if (reward.status !== "PUBLISHED") return false;
  if (reward.stock !== null && reward.stock <= 0) return false;
  if (reward.validUntil !== null && reward.validUntil.getTime() <= now.getTime()) return false;
  return true;
}
