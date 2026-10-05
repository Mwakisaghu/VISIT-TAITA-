"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  CREATOR_LIMITS as L,
  CREATOR_SPECIALTIES,
  CREATOR_TERMS_VERSION,
  CREATOR_TRACKS,
  parseLinks,
  type CreatorSpecialtyValue,
  type CreatorTrackValue,
} from "@/lib/creators";
import { notifyCreatorApplication } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requireVerifiedEmail } from "@/lib/verified-email";

export type CreatorApplyResult = { success?: true; error?: string };

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/** Apply to join the Field Crew. Sign-in is required so an approval can grant the account its role. */
export async function submitCreatorApplication(formData: FormData): Promise<CreatorApplyResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Please sign in to apply." };
  const userId = session.user.id;

  // We email the decision to the account address and publish a profile, so the address must be confirmed as theirs.
  const emailCheck = await requireVerifiedEmail(userId, session.user.role);
  if (!emailCheck.ok) return { error: emailCheck.error };

  if (!rateLimit(`creator-apply:${userId}`, 3, 24 * 60 * 60 * 1000)) {
    return { error: "You've applied several times today — please try again tomorrow." };
  }

  // ---- validate (specific messages beat a generic "check the form") ----
  const track = text(formData, "track") as CreatorTrackValue;
  if (!CREATOR_TRACKS.includes(track)) return { error: "Please choose a track: Local Voice or Visiting Creator." };

  const displayName = text(formData, "displayName");
  if (displayName.length < L.nameMin || displayName.length > L.nameMax) {
    return { error: `Your public name should be ${L.nameMin}–${L.nameMax} characters.` };
  }

  const bio = text(formData, "bio");
  if (bio.length < L.bioMin || bio.length > L.bioMax) {
    return { error: `Your bio should be ${L.bioMin}–${L.bioMax} characters.` };
  }

  const specialties = [...new Set(formData.getAll("specialties").map(String))].filter((s): s is CreatorSpecialtyValue =>
    (CREATOR_SPECIALTIES as readonly string[]).includes(s)
  );
  if (specialties.length === 0) return { error: "Pick at least one thing you create." };

  const location = text(formData, "location");
  if (location.length > L.locationMax) return { error: `Keep your location under ${L.locationMax} characters.` };

  const { links, invalid } = parseLinks(text(formData, "portfolioLinks"));
  if (invalid.length > 0) {
    return { error: `These don't look like web addresses: ${invalid.slice(0, 3).join(", ")}${invalid.length > 3 ? "…" : ""}` };
  }
  if (links.length > L.maxLinks) return { error: `Share up to ${L.maxLinks} links.` };
  if (track === "VISITING_CREATOR" && links.length === 0) {
    return { error: "Visiting creators need to share at least one link to their work." };
  }

  const pitch = text(formData, "pitch");
  if (pitch.length < L.pitchMin || pitch.length > L.pitchMax) {
    return { error: `Tell us why Taita, and a story you'd tell (${L.pitchMin}–${L.pitchMax} characters).` };
  }

  const followerNote = text(formData, "followerNote");
  if (followerNote.length > L.followerNoteMax) return { error: `Keep the audience note under ${L.followerNoteMax} characters.` };

  if (formData.get("agree") !== "on") {
    return { error: "Please confirm you've read and agree to the creator guidelines." };
  }

  // ---- state checks ----
  if (await prisma.creator.findUnique({ where: { userId }, select: { id: true } })) {
    return { error: "You're already in the Field Crew." };
  }
  if (await prisma.creatorApplication.findFirst({ where: { userId, status: "PENDING" }, select: { id: true } })) {
    return { error: "You already have an application under review." };
  }

  const created = await prisma.creatorApplication.create({
    data: {
      userId,
      track,
      displayName,
      bio,
      specialties,
      location: location || null,
      portfolioLinks: links,
      pitch,
      followerNote: followerNote || null,
      agreedToTermsAt: new Date(),
      termsVersion: CREATOR_TERMS_VERSION,
    },
  });

  // Two simultaneous submissions can both pass the check above. Keep the earliest and
  // withdraw any later one, so exactly one pending application survives however they race.
  const earliest = await prisma.creatorApplication.findFirst({
    where: { userId, status: "PENDING" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  if (earliest && earliest.id !== created.id) {
    await prisma.creatorApplication.delete({ where: { id: created.id } });
    return { error: "You already have an application under review." };
  }

  revalidatePath("/admin/creators");
  revalidatePath("/admin");
  revalidatePath("/creators/apply");

  // Saved first — a mail failure must never lose an application.
  await notifyCreatorApplication({
    track,
    displayName,
    specialties,
    location: location || null,
    linkCount: links.length,
    pitch,
  });

  return { success: true };
}
