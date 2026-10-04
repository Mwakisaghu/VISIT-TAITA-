"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseLinks } from "@/lib/creators";
import { NOTE_LIMITS as L, noteSlug } from "@/lib/field-notes";
import { getVerification } from "@/lib/field-notes-data";
import { disclosureLine } from "@/lib/missions";
import { notifyFieldNoteSubmitted } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export type FieldNoteResult = { success?: true; error?: string };

function text(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/**
 * Files (or revises) a Field Note for a mission the creator has claimed.
 *
 * The rule that makes the programme different: it can only be filed after a VERIFIED
 * (QR or GPS) check-in at the mission's place made after the mission was claimed. The
 * check-in's time and method are copied onto the note — that is the "Verified on
 * location" badge. A note awaiting review, or one that needs changes, can be edited;
 * a published (or hidden) one is locked.
 */
export async function submitFieldNote(missionId: string, formData: FormData): Promise<FieldNoteResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Please sign in." };
  const userId = session.user.id;

  if (!rateLimit(`field-note:${userId}`, 10, 60 * 60 * 1000)) {
    return { error: "You've submitted several times recently — please try again later." };
  }

  const creator = await prisma.creator.findUnique({
    where: { userId },
    select: { id: true, slug: true, displayName: true, status: true },
  });
  if (!creator) return { error: "Field Notes are for Field Crew members." };
  if (creator.status !== "ACTIVE") return { error: "Your Field Crew profile is paused, so you can't file notes." };

  const mission = await prisma.mission.findUnique({
    where: { id: String(missionId) },
    include: { destination: { select: { name: true } }, sponsor: { select: { name: true } } },
  });
  if (!mission || mission.status === "DRAFT") return { error: "Mission not found." };

  const claim = await prisma.missionClaim.findUnique({
    where: { missionId_creatorId: { missionId: mission.id, creatorId: creator.id } },
    include: { note: { select: { id: true, status: true } } },
  });
  if (!claim || claim.status === "WITHDRAWN") return { error: "You haven't claimed this mission." };
  if (claim.status === "COMPLETED" || claim.note?.status === "APPROVED" || claim.note?.status === "HIDDEN") {
    return { error: "This Field Note has already been published, so it can't be changed." };
  }

  // ---- the verified-on-location rule ----
  const verification = await getVerification(userId, mission.destinationId, claim.claimedAt);
  if (!verification.verified || !verification.at || !verification.method) {
    return {
      error: `Check in at ${mission.destination.name} first — scan the QR code there, or use "Check in here" on your Passport — then file your note. (A check-in from before you claimed the mission doesn't count; check in again.)`,
    };
  }

  // ---- the note itself ----
  const title = text(formData, "title");
  if (title.length < L.titleMin || title.length > L.titleMax) return { error: `The title should be ${L.titleMin}–${L.titleMax} characters.` };

  const answers: string[] = [];
  for (let i = 0; i < mission.prompts.length; i++) {
    const a = text(formData, `answer-${i}`);
    if (a.length < L.answerMin || a.length > L.answerMax) {
      return { error: `Answer every prompt (${L.answerMin}–${L.answerMax} characters each) — "${mission.prompts[i]}" needs more.` };
    }
    answers.push(a);
  }

  const body = text(formData, "body");
  if (body.length > L.bodyMax) return { error: `Keep the story under ${L.bodyMax} characters.` };
  if (mission.prompts.length === 0 && body.length < L.bodyMinWithoutPrompts) {
    return { error: `Tell the story in at least ${L.bodyMinWithoutPrompts} characters.` };
  }

  const photos = parseLinks(text(formData, "photos"));
  if (photos.invalid.length > 0) return { error: `These photo links aren't web addresses: ${photos.invalid.slice(0, 3).join(", ")}` };
  if (photos.links.length > L.maxPhotos) return { error: `Share up to ${L.maxPhotos} photos.` };
  const links = parseLinks(text(formData, "links"));
  if (links.invalid.length > 0) return { error: `These post links aren't web addresses: ${links.invalid.slice(0, 3).join(", ")}` };
  if (links.links.length > L.maxLinks) return { error: `Share up to ${L.maxLinks} links to your posts.` };
  if (photos.links.length === 0 && links.links.length === 0) {
    return { error: "Add at least one photo link, or a link to where you've posted about this." };
  }

  // ---- disclosure ----
  const line = disclosureLine({ support: mission.support, hostName: mission.hostName, sponsorName: mission.sponsor?.name ?? null });
  if (mission.support !== "NONE" && formData.get("disclosed") !== "on") {
    return { error: "Please confirm you've disclosed this mission's support in your own posts." };
  }

  const data = {
    title,
    promptsSnapshot: mission.prompts,
    answers,
    body: body || null,
    photos: photos.links,
    links: links.links,
    disclosureText: line,
    disclosureConfirmed: mission.support !== "NONE",
    verifiedAt: verification.at,
    verifiedMethod: verification.method as "QR" | "LOCATION",
  };

  try {
    await prisma.$transaction(async (tx) => {
      if (claim.note) {
        await tx.fieldNote.update({
          where: { id: claim.note.id },
          data: { ...data, status: "PENDING", reviewNote: null, reviewedAt: null, reviewedById: null },
        });
      } else {
        await tx.fieldNote.create({
          data: { ...data, slug: noteSlug(mission.slug, creator.slug), claimId: claim.id, missionId: mission.id, creatorId: creator.id },
        });
      }
      await tx.missionClaim.updateMany({ where: { id: claim.id, status: { in: ["ACTIVE", "SUBMITTED"] } }, data: { status: "SUBMITTED" } });
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "You've already submitted a note for this mission." };
    console.error("[field-notes] submit failed", err);
    return { error: "Something went wrong — please try again." };
  }

  revalidatePath("/crew");
  revalidatePath(`/crew/notes/${mission.slug}`);
  revalidatePath("/admin/field-notes");
  revalidatePath("/admin");

  await notifyFieldNoteSubmitted({
    title,
    creatorName: creator.displayName,
    missionTitle: mission.title,
    place: mission.destination.name,
    revised: !!claim.note,
  });

  return { success: true };
}
