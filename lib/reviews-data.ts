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
