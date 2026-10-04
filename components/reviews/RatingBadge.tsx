/** Compact "★ 4.6 (12)" for listing cards. Renders nothing when there are no reviews. */
export default function RatingBadge({
  rating,
}: {
  rating: { average: number; count: number } | null | undefined;
}) {
  if (!rating || rating.count <= 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1 font-body text-xs text-stone/70"
      aria-label={`Rated ${rating.average.toFixed(1)} out of 5 from ${rating.count} review${rating.count === 1 ? "" : "s"}`}
    >
      <span className="text-ochre" aria-hidden="true">
        ★
      </span>
      <span aria-hidden="true">{rating.average.toFixed(1)}</span>
      <span className="text-stone/40" aria-hidden="true">
        ({rating.count})
      </span>
    </span>
  );
}
