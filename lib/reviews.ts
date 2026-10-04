// Pure helpers for reviews (no Node-only imports, so safe in client components too).

export type ReviewKind = "accommodation" | "experience";

export function isReviewKind(value: unknown): value is ReviewKind {
  return value === "accommodation" || value === "experience";
}

export const REVIEW_MIN_BODY = 20;
export const REVIEW_MAX_BODY = 2000;
export const REVIEW_MAX_TITLE = 100;
export const REVIEW_MAX_REASON = 500;

export type RatingSummary = {
  /** Mean rating to one decimal place, or null when there are no reviews. */
  average: number | null;
  count: number;
  /** How many reviews gave each star rating. */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

/** Builds the summary from per-rating counts (what a GROUP BY returns). */
export function summarizeRatings(rows: { rating: number; count: number }[]): RatingSummary {
  const distribution: RatingSummary["distribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;
  for (const { rating, count } of rows) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || count <= 0) continue;
    distribution[rating as 1 | 2 | 3 | 4 | 5] += count;
    total += count;
    sum += rating * count;
  }
  return {
    average: total === 0 ? null : Math.round((sum / total) * 10) / 10,
    count: total,
    distribution,
  };
}

/** "★★★★☆" — for plain-text contexts such as emails. */
export function starString(rating: number) {
  const r = Math.min(5, Math.max(0, Math.round(rating)));
  return "★".repeat(r) + "☆".repeat(5 - r);
}
