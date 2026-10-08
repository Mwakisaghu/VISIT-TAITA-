import { checkinBaseUrl, isLocalUrl } from "@/lib/checkin-url";
import { getApprovedReviews } from "@/lib/reviews-data";
import type { ReviewKind } from "@/lib/reviews";
import { jsonLdString, listingJsonLd } from "@/lib/structured-data";
import { safeHttpUrl } from "@/lib/url";
import { holderLabel } from "@/lib/voucher-lookup";
import StarRating from "@/components/reviews/StarRating";
import ReviewComposer from "@/components/reviews/ReviewComposer";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * The public part of the reviews area. It reads only APPROVED reviews and never
 * the session, so the listing page keeps its ISR caching; the visitor's own
 * form is a client component that loads separately.
 */
export default async function ReviewsSection({
  kind,
  listingId,
  listingName,
  structuredData,
}: {
  kind: ReviewKind;
  listingId: string;
  listingName: string;
  /** When given, the page also emits schema.org rating data (only if there are approved reviews). */
  structuredData?: { description: string; image: string; path: string };
}) {
  const { summary, reviews } = await getApprovedReviews(kind, listingId);

  const base = checkinBaseUrl();
  const jsonLd = structuredData
    ? listingJsonLd({
        kind,
        name: listingName,
        description: structuredData.description,
        image: safeHttpUrl(structuredData.image),
        // Only a real public address — never a localhost URL in the markup.
        url: base && !isLocalUrl(base) ? `${base}${structuredData.path}` : null,
        summary,
      })
    : null;

  return (
    <section id="reviews" className="mt-20 scroll-mt-24 border-t border-stone/10 pt-12">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />}
      <h2 className="font-display text-3xl text-stone">Reviews</h2>

      <div className="mt-8 grid gap-12 lg:grid-cols-3">
        {/* SUMMARY */}
        <div>
          {summary.count === 0 ? (
            <p className="font-body text-stone/70">No reviews yet — be the first to share your experience.</p>
          ) : (
            <>
              <div className="flex items-end gap-3">
                <p className="font-display text-5xl text-stone">{summary.average?.toFixed(1)}</p>
                <div className="pb-1">
                  <StarRating rating={summary.average ?? 0} className="text-lg" />
                  <p className="font-body text-sm text-stone/70">
                    {summary.count} review{summary.count === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <ul className="mt-6 flex flex-col gap-2">
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const n = summary.distribution[star];
                  const pct = Math.round((n / summary.count) * 100);
                  return (
                    <li key={star} className="flex items-center gap-3 font-body text-xs text-stone/70">
                      <span className="w-8">{star} ★</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone/10">
                        <span className="block h-full rounded-full bg-ochre" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="w-6 text-right">{n}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* LIST + COMPOSER */}
        <div className="lg:col-span-2">
          {reviews.length > 0 && (
            <div className="divide-y divide-stone/10">
              {reviews.map((r) => (
                <article key={r.id} className="py-6 first:pt-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <StarRating rating={r.rating} />
                    {r.verified && (
                      <span className="rounded-full bg-canopy/15 px-3 py-0.5 font-body text-xs text-canopy">
                        Verified guest
                      </span>
                    )}
                  </div>
                  {r.title && <p className="mt-2 font-display text-lg text-stone">{r.title}</p>}
                  <p className="mt-2 whitespace-pre-line font-body text-stone/80">{r.body}</p>
                  <p className="mt-3 font-body text-xs text-stone/70">
                    {holderLabel(r.user.name)} · {formatDate(r.createdAt)}
                  </p>
                </article>
              ))}
              {reviews.length === 20 && (
                <p className="pt-4 font-body text-xs text-stone/40">Showing the 20 most recent reviews.</p>
              )}
            </div>
          )}

          <div className={reviews.length > 0 ? "mt-10" : ""}>
            <ReviewComposer kind={kind} listingId={listingId} listingName={listingName} />
          </div>
        </div>
      </div>
    </section>
  );
}
