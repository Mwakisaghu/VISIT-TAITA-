"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import {
  CHECKIN_POINTS,
  MAX_GPS_ACCURACY_M,
  distanceMetres,
  formatDistance,
  isWithinCheckinRadius,
} from "@/lib/passport";

export type CheckinResult = {
  success?: true;
  error?: string;
  destinationName?: string;
  pointsAwarded?: number;
  alreadyCheckedIn?: boolean;
  newBadges?: string[];
};

const CATEGORY_BADGE: Record<string, string> = {
  WILD: "TAITA_WILD",
  CULTURE: "TAITA_CULTURE",
  ADVENTURE: "TAITA_TRAILS",
  FOOD: "TAITA_TASTE",
  SPORT: "TAITA_SPORT",
  PEOPLE: "TAITA_EXPLORER",
};

const RATE_LIMITED: CheckinResult = {
  error: "Too many check-in attempts — please wait a few minutes and try again.",
};

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/** Returns the badge's label if it was newly earned, otherwise null. */
async function awardBadge(userId: string, key: string): Promise<string | null> {
  const badge = await prisma.badge.findUnique({ where: { key } });
  if (!badge) return null;

  const existing = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
  });
  if (existing) return null;

  try {
    await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
    return badge.label;
  } catch (err) {
    if (isUniqueViolation(err)) return null; // earned concurrently
    throw err;
  }
}

/**
 * Badges are awarded from the user's visits. Points are NOT touched here —
 * they live in the PointsEntry ledger and change only through check-ins and
 * redemptions. Returns the labels of any badges earned just now.
 */
async function evaluateBadges(userId: string): Promise<string[]> {
  const visits = await prisma.visit.findMany({
    where: { userId },
    include: { destination: true },
  });
  if (visits.length === 0) return [];

  const earned: (string | null)[] = [];

  // First visit of any kind
  earned.push(await awardBadge(userId, "TAITA_EXPLORER"));

  // Category-specific badges
  const categories = new Set(visits.map((v) => v.destination.category));
  for (const category of categories) {
    const key = CATEGORY_BADGE[category];
    if (key) earned.push(await awardBadge(userId, key));
  }

  // Insider: 3+ distinct categories
  if (categories.size >= 3) earned.push(await awardBadge(userId, "TAITA_INSIDER"));

  // Legend: visited every published destination
  const publishedCount = await prisma.destination.count({ where: { status: "PUBLISHED" } });
  if (publishedCount > 0 && visits.length >= publishedCount) {
    earned.push(await awardBadge(userId, "TAITA_LEGEND"));
  }

  return earned.filter((label): label is string => label !== null);
}

/**
 * Records a verified check-in: creates (or upgrades a self-reported) visit,
 * awards points at most once per person per destination, then re-evaluates
 * badges. The "at most once" rule is enforced by the database's unique
 * constraint on (userId, destinationId, reason), so concurrent scans,
 * un-marking and re-marking, or switching between QR and GPS can't pay twice.
 */
async function recordVerifiedCheckin(
  userId: string,
  destination: { id: string; name: string },
  method: "QR" | "LOCATION"
): Promise<CheckinResult> {
  const existing = await prisma.visit.findUnique({
    where: { userId_destinationId: { userId, destinationId: destination.id } },
  });

  if (!existing) {
    try {
      await prisma.visit.create({ data: { userId, destinationId: destination.id, method } });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err; // created concurrently — fine
    }
  } else if (existing.method === "SELF_REPORTED") {
    await prisma.visit.update({
      where: { id: existing.id },
      data: { method, visitedAt: new Date() },
    });
  }

  let pointsAwarded = 0;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.pointsEntry.create({
        data: {
          userId,
          points: CHECKIN_POINTS,
          reason: "CHECKIN",
          destinationId: destination.id,
          note: `Check-in: ${destination.name}`,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { points: { increment: CHECKIN_POINTS } },
      });
    });
    pointsAwarded = CHECKIN_POINTS;
  } catch (err) {
    if (!isUniqueViolation(err)) throw err; // already awarded for this destination
  }

  const newBadges = await evaluateBadges(userId);

  revalidatePath("/passport");
  revalidatePath("/discover");

  return {
    success: true,
    destinationName: destination.name,
    pointsAwarded,
    alreadyCheckedIn: pointsAwarded === 0,
    newBadges,
  };
}

// ---------------------------------------------------------------------------
// Verified check-in: scanning the QR plaque at a destination
// ---------------------------------------------------------------------------

export async function checkInWithToken(token: string): Promise<CheckinResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Please sign in to check in." };
  const userId = session.user.id;

  if (!rateLimit(`checkin:${userId}`, 10, 10 * 60 * 1000)) return RATE_LIMITED;

  const value = String(token ?? "").trim();
  if (value.length < 8 || value.length > 100) return { error: "This check-in code isn't valid." };

  const destination = await prisma.destination.findFirst({
    where: { checkinToken: value, status: "PUBLISHED" },
    select: { id: true, name: true },
  });
  if (!destination) return { error: "This check-in code isn't valid." };

  return recordVerifiedCheckin(userId, destination, "QR");
}

// ---------------------------------------------------------------------------
// Verified check-in: GPS, within the destination's radius
// ---------------------------------------------------------------------------
// Browser-reported coordinates can be faked by a determined person, so this is
// friction and good-faith verification, not proof. The QR plaque is the
// stronger signal; rotate a destination's token if one leaks.

export async function checkInWithLocation(
  destinationId: string,
  latitude: number,
  longitude: number,
  accuracy: number
): Promise<CheckinResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Please sign in to check in." };
  const userId = session.user.id;

  if (!rateLimit(`checkin:${userId}`, 10, 10 * 60 * 1000)) return RATE_LIMITED;

  const valid =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Number.isFinite(accuracy) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    accuracy >= 0;
  if (!valid) return { error: "We couldn't read your location. Please try again." };

  if (accuracy > MAX_GPS_ACCURACY_M) {
    return {
      error: "Your location isn't precise enough yet. Step outside or into the open and try again.",
    };
  }

  const destination = await prisma.destination.findFirst({
    where: { id: String(destinationId), status: "PUBLISHED" },
    select: { id: true, name: true, latitude: true, longitude: true, checkinRadiusM: true },
  });
  if (!destination) return { error: "This place isn't available for check-in." };

  if (destination.latitude === null || destination.longitude === null) {
    return { error: "This place doesn't support location check-in yet — scan its QR code on site instead." };
  }

  const distanceM = distanceMetres(latitude, longitude, destination.latitude, destination.longitude);
  if (!isWithinCheckinRadius({ distanceM, accuracyM: accuracy, radiusM: destination.checkinRadiusM })) {
    return {
      error: `You're about ${formatDistance(distanceM)} from ${destination.name}. Get closer and try again.`,
    };
  }

  return recordVerifiedCheckin(userId, destination, "LOCATION");
}

// ---------------------------------------------------------------------------
// Self-reported visits ("I've been here") — NO points, verified visits stay put
// ---------------------------------------------------------------------------

export async function toggleVisit(destinationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("You need to sign in to use the Passport.");

  const userId = session.user.id;
  const existing = await prisma.visit.findUnique({
    where: { userId_destinationId: { userId, destinationId } },
  });

  if (existing) {
    // A verified check-in can't be un-marked; only self-reported visits can.
    if (existing.method === "SELF_REPORTED") {
      await prisma.visit.delete({ where: { id: existing.id } });
    }
  } else {
    await prisma.visit.create({ data: { userId, destinationId, method: "SELF_REPORTED" } });
  }

  await evaluateBadges(userId);

  revalidatePath("/passport");
  revalidatePath("/discover");
}
