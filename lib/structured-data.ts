import type { RatingSummary, ReviewKind } from "@/lib/reviews";

/**
 * schema.org rating data for a listing page. Built only from APPROVED reviews
 * (the summary passed in), and only when there is at least one — never an empty
 * or invented rating. A stay is a LodgingBusiness; an experience is a Product
 * (the types search engines accept review ratings for).
 */
export function listingJsonLd(opts: {
  kind: ReviewKind;
  name: string;
  description: string;
  image: string | null;
  url: string | null;
  summary: RatingSummary;
}): Record<string, unknown> | null {
  const { summary } = opts;
  if (summary.count <= 0 || summary.average === null) return null;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": opts.kind === "accommodation" ? "LodgingBusiness" : "Product",
    name: opts.name,
    description: opts.description.slice(0, 500),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: summary.average,
      reviewCount: summary.count,
      bestRating: 5,
      worstRating: 1,
    },
  };
  if (opts.image) data.image = opts.image;
  if (opts.url) data.url = opts.url;
  return data;
}

/**
 * Serialises for a <script type="application/ld+json"> tag. Listing names and
 * descriptions are admin/partner-supplied text, so "<", ">" and "&" are escaped:
 * a value like "</script><script>…" can't close the tag and inject markup.
 */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** The organisation, for search engines and link previews. `sameAs` lists its official social profiles. */
export function organizationJsonLd(opts: { name: string; url: string; logo: string; description: string; email?: string | null; sameAs?: string[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: opts.name,
    url: opts.url,
    logo: opts.logo,
    description: opts.description,
    ...(opts.email ? { email: opts.email } : {}),
    ...(opts.sameAs && opts.sameAs.length > 0 ? { sameAs: opts.sameAs } : {}),
  };
}
