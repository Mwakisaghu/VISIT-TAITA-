import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StarRating from "@/components/reviews/StarRating";
import ReviewModeration from "@/components/admin/ReviewModeration";

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
const LABELS: Record<(typeof STATUSES)[number], string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export default async function AdminReviewsPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = STATUSES.find((s) => s === searchParams.status) ?? "PENDING";

  const [reviews, grouped] = await Promise.all([
    prisma.review.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
        accommodation: { select: { name: true, slug: true } },
        experience: { select: { name: true, slug: true } },
      },
    }),
    prisma.review.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Reviews</h1>

      <div className="mt-6 flex gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/reviews?status=${s}`}
            className={`focus-ring rounded-full border px-4 py-1.5 font-body text-sm transition-colors ${
              s === status ? "border-rust bg-rust text-parchment" : "border-stone/20 text-stone hover:border-rust hover:text-rust"
            }`}
          >
            {LABELS[s]} ({counts.get(s) ?? 0})
          </Link>
        ))}
      </div>

      <div className="mt-8 divide-y divide-stone/10">
        {reviews.map((r) => {
          const listing = r.accommodation
            ? { name: r.accommodation.name, href: `/stay/listing/${r.accommodation.slug}`, type: "Stay" }
            : r.experience
              ? { name: r.experience.name, href: `/experiences/listing/${r.experience.slug}`, type: "Experience" }
              : null;
          return (
            <div key={r.id} className="py-6">
              <div className="flex flex-wrap items-center gap-3">
                <StarRating rating={r.rating} />
                {r.verified && (
                  <span className="rounded-full bg-canopy/15 px-3 py-0.5 font-body text-xs text-canopy">Verified guest</span>
                )}
                {listing && (
                  <Link href={listing.href} className="font-body text-sm text-stone/70 hover:text-rust">
                    {listing.type}: {listing.name} ↗
                  </Link>
                )}
              </div>
              {r.title && <p className="mt-2 font-display text-lg text-stone">{r.title}</p>}
              <p className="mt-2 max-w-prose whitespace-pre-line font-body text-sm text-stone/80">{r.body}</p>
              <p className="mt-2 font-body text-xs text-stone/50">
                {r.user.name} · {r.user.email} · {r.createdAt.toLocaleString()}
                {r.rejectionReason ? ` · rejected: ${r.rejectionReason}` : ""}
              </p>
              <div className="mt-4">
                <ReviewModeration reviewId={r.id} status={r.status} />
              </div>
            </div>
          );
        })}
        {reviews.length === 0 && (
          <p className="py-8 font-body text-stone/50">
            {status === "PENDING" ? "Nothing waiting for approval." : `No ${LABELS[status].toLowerCase()} reviews.`}
          </p>
        )}
      </div>
    </div>
  );
}
