import { prisma } from "@/lib/prisma";

/** Experiences in the same area as a stay: published ones whose region matches, with their next few open dates. (Stays and experiences don't have map coordinates yet, so "near" means "the same region".) */
export async function getNearbyExperiences(region: string, now: Date, take = 3) {
  if (!region.trim()) return [];
  return prisma.experience.findMany({
    where: { status: "PUBLISHED", region: { equals: region.trim(), mode: "insensitive" } },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    take,
    include: { sessions: { where: { status: "OPEN", startsAt: { gt: now } }, orderBy: { startsAt: "asc" }, take: 2, select: { startsAt: true, capacity: true, seatsTaken: true, status: true } } },
  });
}
