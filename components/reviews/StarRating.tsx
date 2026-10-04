/** Read-only stars. Accessible: screen readers get "4 out of 5 stars", not five glyphs. */
export default function StarRating({ rating, className = "" }: { rating: number; className?: string }) {
  const filled = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className={`inline-flex ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden="true" className={n <= filled ? "text-ochre" : "text-stone/20"}>
          ★
        </span>
      ))}
    </span>
  );
}
