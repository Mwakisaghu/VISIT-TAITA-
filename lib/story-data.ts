import { prisma } from "@/lib/prisma";

/** What is near a story's place: one stay and one experience in the same region (stays and experiences don't have map coordinates yet, so "near" means "the same region"). */
export async function getStoryLoop(region: string | null | undefined, now: Date) {
  const r = (region ?? "").trim();
  if (!r) return { stay: null, experience: null };
  const same = { equals: r, mode: "insensitive" as const };
  const [stay, experience] = await Promise.all([
    prisma.accommodation.findFirst({ where: { status: "PUBLISHED", region: same }, orderBy: [{ featured: "desc" }, { name: "asc" }], select: { slug: true, name: true, image: true, priceFrom: true } }),
    prisma.experience.findFirst({
      where: { status: "PUBLISHED", region: same }, orderBy: [{ featured: "desc" }, { name: "asc" }],
      select: { slug: true, name: true, image: true, sessions: { where: { status: "OPEN", startsAt: { gt: now } }, orderBy: { startsAt: "asc" }, take: 1, select: { startsAt: true, capacity: true, seatsTaken: true, status: true } } },
    }),
  ]);
  return { stay, experience };
}
