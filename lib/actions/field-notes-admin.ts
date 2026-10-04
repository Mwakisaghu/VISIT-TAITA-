"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { NOTE_LIMITS, noteStatusLabel } from "@/lib/field-notes";
import { notifyFieldNoteDecision } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export type NoteAdminResult = { success?: true; error?: string };

class NoteError extends Error {}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) throw new Error("Admin access required.");
  return session.user;
}

function failure(err: unknown, what: string): NoteAdminResult {
  if (err instanceof NoteError) return { error: err.message };
  if (err instanceof Error && /Admin access/.test(err.message)) return { error: "Admin access required." };
  console.error(`[field-notes] ${what} failed`, err);
  return { error: "Something went wrong — please try again." };
}

function revalidateNote(slug: string) {
  revalidatePath("/admin/field-notes");
  revalidatePath("/admin");
  revalidatePath("/notes");
  revalidatePath(`/notes/${slug}`);
  revalidatePath("/crew");
}

const noteInclude = {
  mission: { select: { rewardPoints: true, title: true, slug: true } },
  creator: { select: { userId: true, displayName: true, slug: true, user: { select: { email: true } } } },
} as const;

/**
 * Publishes a pending note, completes the creator's claim and awards the mission's points —
 * all in ONE transaction. The PENDING -> APPROVED move is a conditional update, so two
 * editors approving at once can't award the points twice.
 */
export async function approveFieldNote(noteId: string): Promise<NoteAdminResult> {
  let outcome: { slug: string; email: string; name: string; title: string; points: number } | null = null;
  try {
    const admin = await requireAdmin();

    outcome = await prisma.$transaction(async (tx) => {
      const note = await tx.fieldNote.findUnique({ where: { id: String(noteId) }, include: noteInclude });
      if (!note) throw new NoteError("Note not found.");
      if (note.status !== "PENDING") throw new NoteError(`This note is already ${noteStatusLabel(note.status).toLowerCase()}.`);

      const points = note.mission.rewardPoints;
      const now = new Date();
      const moved = await tx.fieldNote.updateMany({
        where: { id: note.id, status: "PENDING" },
        data: { status: "APPROVED", reviewedAt: now, reviewedById: admin.id, reviewNote: null, publishedAt: now, pointsAwarded: points },
      });
      if (moved.count === 0) throw new NoteError("This note was just handled by someone else.");

      await tx.missionClaim.update({ where: { id: note.claimId }, data: { status: "COMPLETED" } });

      if (points > 0) {
        await tx.user.update({ where: { id: note.creator.userId }, data: { points: { increment: points } } });
        await tx.pointsEntry.create({
          data: { userId: note.creator.userId, points, reason: "MISSION", note: `Field Note: ${note.mission.title}` },
        });
      }
      return { slug: note.slug, email: note.creator.user.email, name: note.creator.displayName, title: note.title, points };
    });
  } catch (err) {
    return failure(err, "approval");
  }

  revalidateNote(outcome.slug);
  await notifyFieldNoteDecision({ decision: "APPROVED", email: outcome.email, name: outcome.name, title: outcome.title, slug: outcome.slug, reason: null, points: outcome.points });
  return { success: true };
}

/** Sends a pending note back to the creator with a note about what to fix. The reason is required. */
export async function requestNoteChanges(noteId: string, reason: string): Promise<NoteAdminResult> {
  let outcome: { slug: string; email: string; name: string; title: string; reason: string } | null = null;
  try {
    const admin = await requireAdmin();
    const cleanReason = String(reason ?? "").trim().slice(0, NOTE_LIMITS.reasonMax);
    if (!cleanReason) return { error: "Say what needs to change — the creator will see this." };

    const note = await prisma.fieldNote.findUnique({ where: { id: String(noteId) }, include: noteInclude });
    if (!note) return { error: "Note not found." };
    if (note.status !== "PENDING") return { error: `This note is already ${noteStatusLabel(note.status).toLowerCase()}.` };

    const moved = await prisma.fieldNote.updateMany({
      where: { id: note.id, status: "PENDING" },
      data: { status: "CHANGES_REQUESTED", reviewedAt: new Date(), reviewedById: admin.id, reviewNote: cleanReason },
    });
    if (moved.count === 0) return { error: "This note was just handled by someone else." };
    outcome = { slug: note.slug, email: note.creator.user.email, name: note.creator.displayName, title: note.title, reason: cleanReason };
  } catch (err) {
    return failure(err, "request changes");
  }

  revalidateNote(outcome.slug);
  await notifyFieldNoteDecision({ decision: "CHANGES_REQUESTED", email: outcome.email, name: outcome.name, title: outcome.title, slug: outcome.slug, reason: outcome.reason, points: 0 });
  return { success: true };
}

/** Takes a published note off the public site (nothing is deleted; no points are taken back). */
export async function hideFieldNote(noteId: string): Promise<NoteAdminResult> {
  return moveBetween(noteId, "APPROVED", "HIDDEN");
}

/** Puts a hidden note back. Points were awarded when it was first approved, so none are awarded again. */
export async function unhideFieldNote(noteId: string): Promise<NoteAdminResult> {
  return moveBetween(noteId, "HIDDEN", "APPROVED");
}

async function moveBetween(noteId: string, from: "APPROVED" | "HIDDEN", to: "APPROVED" | "HIDDEN"): Promise<NoteAdminResult> {
  try {
    await requireAdmin();
    const note = await prisma.fieldNote.findUnique({ where: { id: String(noteId) }, select: { id: true, slug: true, status: true } });
    if (!note) return { error: "Note not found." };
    const moved = await prisma.fieldNote.updateMany({ where: { id: note.id, status: from }, data: { status: to } });
    if (moved.count === 0) return { error: `Only a ${noteStatusLabel(from).toLowerCase()} note can be ${to === "HIDDEN" ? "hidden" : "restored"}.` };
    revalidateNote(note.slug);
    return { success: true };
  } catch (err) {
    return failure(err, "visibility change");
  }
}
