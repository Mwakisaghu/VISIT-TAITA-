"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TRACK_LABELS, type CreatorTrackValue } from "@/lib/creators";
import {
  MAX_ACTIVE_CLAIMS,
  UNAVAILABLE_MESSAGES,
  isEligibleTrack,
  missionAvailability,
} from "@/lib/missions";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export type MissionResult = { success?: true; error?: string };

export type MyMissionState = {
  state: "signin" | "not-creator" | "paused" | "ineligible" | "unavailable" | "available" | "claimed";
  message?: string;
};

/** A problem the creator should be told about; thrown inside the transaction so nothing is kept. */
class ClaimError extends Error {}

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

function eligibilityMessage(missionTrack: string | null) {
  return `This mission is open to ${TRACK_LABELS[missionTrack as CreatorTrackValue] ?? "other"}s only.`;
}

function revalidateMission(slug: string) {
  revalidatePath("/missions");
  revalidatePath(`/missions/${slug}`);
  revalidatePath("/crew");
  revalidatePath("/admin/missions");
}

/** What the signed-in visitor can do on a mission page (loaded on the client so the page stays cacheable). */
export async function getMyMissionState(missionId: string): Promise<MyMissionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { state: "signin" };

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
    select: { id: true, status: true, track: true },
  });
  if (!creator) return { state: "not-creator" };
  if (creator.status !== "ACTIVE") return { state: "paused" };

  const mission = await prisma.mission.findUnique({ where: { id: String(missionId) } });
  if (!mission || mission.status === "DRAFT") return { state: "unavailable", message: UNAVAILABLE_MESSAGES.draft };

  const claim = await prisma.missionClaim.findUnique({
    where: { missionId_creatorId: { missionId: mission.id, creatorId: creator.id } },
  });
  if (claim && claim.status !== "WITHDRAWN") return { state: "claimed" };

  const availability = missionAvailability(mission);
  if (!availability.open) return { state: "unavailable", message: UNAVAILABLE_MESSAGES[availability.reason] };
  if (!isEligibleTrack(mission.track, creator.track)) {
    return { state: "ineligible", message: eligibilityMessage(mission.track) };
  }
  return { state: "available" };
}

/**
 * Claims a spot on a mission. Everything happens in ONE transaction, and the spot
 * itself is taken with a conditional update (spotsTaken < maxCreators), so two
 * creators racing for the last spot can't both get it.
 */
export async function claimMission(missionId: string): Promise<MissionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Please sign in." };
  const userId = session.user.id;

  if (!await checkRateLimit(`mission-claim:${userId}`, 20, 60 * 60 * 1000)) {
    return { error: "Too many attempts — please try again later." };
  }

  const creator = await prisma.creator.findUnique({
    where: { userId },
    select: { id: true, status: true, track: true },
  });
  if (!creator) return { error: "Missions are for Field Crew members — apply to join first." };
  if (creator.status !== "ACTIVE") return { error: "Your Field Crew profile is paused, so you can't claim missions." };

  let slug = "";
  try {
    await prisma.$transaction(async (tx) => {
      const mission = await tx.mission.findUnique({ where: { id: String(missionId) } });
      if (!mission) throw new ClaimError("Mission not found.");
      slug = mission.slug;

      const availability = missionAvailability(mission);
      if (!availability.open) throw new ClaimError(UNAVAILABLE_MESSAGES[availability.reason]);
      if (!isEligibleTrack(mission.track, creator.track)) throw new ClaimError(eligibilityMessage(mission.track));

      const existing = await tx.missionClaim.findUnique({
        where: { missionId_creatorId: { missionId: mission.id, creatorId: creator.id } },
      });
      if (existing && existing.status !== "WITHDRAWN") throw new ClaimError("You've already claimed this mission.");

      const activeCount = await tx.missionClaim.count({ where: { creatorId: creator.id, status: "ACTIVE" } });
      if (activeCount >= MAX_ACTIVE_CLAIMS) {
        throw new ClaimError(
          `You can hold ${MAX_ACTIVE_CLAIMS} active missions at a time — finish or withdraw one first.`
        );
      }

      const taken = await tx.mission.updateMany({
        where: mission.maxCreators === null ? { id: mission.id } : { id: mission.id, spotsTaken: { lt: mission.maxCreators } },
        data: { spotsTaken: { increment: 1 } },
      });
      if (taken.count === 0) throw new ClaimError(UNAVAILABLE_MESSAGES.full);

      if (existing) {
        await tx.missionClaim.update({
          where: { id: existing.id },
          data: { status: "ACTIVE", withdrawnAt: null, claimedAt: new Date() },
        });
      } else {
        // The app's clock, like the check-in timestamps a Field Note is compared against.
        await tx.missionClaim.create({ data: { missionId: mission.id, creatorId: creator.id, claimedAt: new Date() } });
      }
    });
  } catch (err) {
    if (err instanceof ClaimError) return { error: err.message };
    if (isUniqueViolation(err)) return { error: "You've already claimed this mission." };
    console.error("[missions] claim failed", err);
    return { error: "Something went wrong — please try again." };
  }

  revalidateMission(slug);
  return { success: true };
}

/** Gives a spot back. Only an ACTIVE claim can be withdrawn (a submitted note can't). */
export async function withdrawClaim(missionId: string): Promise<MissionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Please sign in." };

  const creator = await prisma.creator.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!creator) return { error: "Mission not found." };

  let slug = "";
  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.missionClaim.findUnique({
        where: { missionId_creatorId: { missionId: String(missionId), creatorId: creator.id } },
        include: { mission: { select: { slug: true } } },
      });
      if (!claim) throw new ClaimError("You haven't claimed this mission.");
      slug = claim.mission.slug;

      const moved = await tx.missionClaim.updateMany({
        where: { id: claim.id, status: "ACTIVE" },
        data: { status: "WITHDRAWN", withdrawnAt: new Date() },
      });
      if (moved.count === 0) throw new ClaimError("Only an active claim can be withdrawn.");

      await tx.mission.update({ where: { id: claim.missionId }, data: { spotsTaken: { decrement: 1 } } });
    });
  } catch (err) {
    if (err instanceof ClaimError) return { error: err.message };
    console.error("[missions] withdraw failed", err);
    return { error: "Something went wrong — please try again." };
  }

  revalidateMission(slug);
  return { success: true };
}
