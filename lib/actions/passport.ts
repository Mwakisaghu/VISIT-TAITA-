"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CATEGORY_BADGE: Record<string, string> = {
  WILD: "TAITA_WILD",
  CULTURE: "TAITA_CULTURE",
  ADVENTURE: "TAITA_TRAILS",
  FOOD: "TAITA_TASTE",
  SPORT: "TAITA_SPORT",
  PEOPLE: "TAITA_EXPLORER",
};

async function awardBadge(userId: string, key: string) {
  const badge = await prisma.badge.findUnique({ where: { key } });
  if (!badge) return;
  await prisma.userBadge.upsert({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
    update: {},
    create: { userId, badgeId: badge.id },
  });
}

async function evaluateBadges(userId: string) {
  const visits = await prisma.visit.findMany({
    where: { userId },
    include: { destination: true },
  });

  if (visits.length === 0) {
    await prisma.user.update({ where: { id: userId }, data: { points: 0 } });
    return;
  }

  // First visit of any kind
  await awardBadge(userId, "TAITA_EXPLORER");

  // Category-specific badges
  const categories = new Set(visits.map((v) => v.destination.category));
  for (const category of categories) {
    const key = CATEGORY_BADGE[category];
    if (key) await awardBadge(userId, key);
  }

  // Insider: 3+ distinct categories
  if (categories.size >= 3) {
    await awardBadge(userId, "TAITA_INSIDER");
  }

  // Legend: visited every published destination
  const publishedCount = await prisma.destination.count({ where: { status: "PUBLISHED" } });
  if (publishedCount > 0 && visits.length >= publishedCount) {
    await awardBadge(userId, "TAITA_LEGEND");
  }

  // Points: 10 per visit, kept in sync with visit count
  await prisma.user.update({
    where: { id: userId },
    data: { points: visits.length * 10 },
  });
}

export async function toggleVisit(destinationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("You need to sign in to use the Passport.");

  const userId = session.user.id;
  const existing = await prisma.visit.findUnique({
    where: { userId_destinationId: { userId, destinationId } },
  });

  if (existing) {
    await prisma.visit.delete({ where: { id: existing.id } });
  } else {
    await prisma.visit.create({ data: { userId, destinationId } });
  }

  await evaluateBadges(userId);

  revalidatePath("/passport");
  revalidatePath("/discover");
}
