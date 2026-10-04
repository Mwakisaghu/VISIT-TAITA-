import { prisma } from "@/lib/prisma";
import { summarizeRatings, type ReviewKind } from "@/lib/reviews";

function target(kind: ReviewKind, listingId: string) {
  return kind === "accommodation" ? { accommodationId: listingId } : { experienceId: listingId };
}

/**
 * Everything the PUBLIC part of a listing page needs: only APPROVED reviews,
 * with the author reduced to a name (the page shows first name + initial).
 * Deliberately takes no session so the page keeps its ISR caching.
 */
export async function getApprovedReviews(kind: ReviewKind, listingId: string, take = 20) {
  const where = { ...target(kind, listingId), status: "APPROVED" as const };

  const [grouped, reviews] = await Promise.all([
    prisma.review.groupBy({ by: ["rating"], where, _count: { _all: true } }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        verified: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  const summary = summarizeRatings(grouped.map((g) => ({ rating: g.rating, count: g._count._all })));
  return { summary, reviews };
}

/**
 * Average rating + count for MANY listings in one grouped query (so a page of
 * cards costs a single query, not one per card). Only APPROVED reviews count;
 * listings with no approved reviews are simply absent from the map.
 */
export async function getRatingSummaries(
  kind: ReviewKind,
  ids: string[]
): Promise<Map<string, { average: number; count: number }>> {
  const out = new Map<string, { average: number; count: number }>();
  if (ids.length === 0) return out;

  const rows =
    kind === "accommodation"
      ? (
          await prisma.review.groupBy({
            by: ["accommodationId", "rating"],
            where: { accommodationId: { in: ids }, status: "APPROVED" },
            _count: { _all: true },
          })
        ).map((r) => ({ id: r.accommodationId, rating: r.rating, count: r._count._all }))
      : (
          await prisma.review.groupBy({
            by: ["experienceId", "rating"],
            where: { experienceId: { in: ids }, status: "APPROVED" },
            _count: { _all: true },
          })
        ).map((r) => ({ id: r.experienceId, rating: r.rating, count: r._count._all }));

  const byListing = new Map<string, { rating: number; count: number }[]>();
  for (const row of rows) {
    if (!row.id) continue;
    const list = byListing.get(row.id) ?? [];
    list.push({ rating: row.rating, count: row.count });
    byListing.set(row.id, list);
  }

  for (const [id, list] of byListing) {
    const summary = summarizeRatings(list);
    if (summary.average !== null) out.set(id, { average: summary.average, count: summary.count });
  }
  return out;
}
