"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { CREATOR_LIMITS, RESERVED_CREATOR_SLUGS, slugifyName } from "@/lib/creators";
import { notifyCreatorDecision } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export type CreatorAdminResult = { success?: true; error?: string };

class DecisionError extends Error {}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    throw new Error("Admin access required.");
  }
  return session.user;
}

function revalidateAll(slug?: string) {
  revalidatePath("/admin/creators");
  revalidatePath("/admin");
  revalidatePath("/creators");
  if (slug) revalidatePath(`/creators/${slug}`);
}

function failure(err: unknown, what: string): CreatorAdminResult {
  if (err instanceof DecisionError) return { error: err.message };
  if (err instanceof Error && /Admin access/.test(err.message)) return { error: "Admin access required." };
  console.error(`[creators] ${what} failed`, err);
  return { error: "Something went wrong — please try again." };
}

// Roles a plain account can be promoted FROM. Anyone with another role (a partner, a
// seller, staff) keeps it — one account has one role, and approving a creator must never
// strip a partner's dashboard or demote an admin. Their Creator profile exists regardless.
const PROMOTABLE_ROLES = ["MEMBER", "VISITOR"];

/**
 * Approves an application: creates the public profile, marks the application
 * approved, and (for plain accounts) grants the CREATOR role — all in one
 * transaction. The PENDING -> APPROVED move is a conditional update, so two
 * admins approving at once can't create two profiles.
 */
export async function approveCreatorApplication(applicationId: string): Promise<CreatorAdminResult> {
  let outcome: { slug: string; email: string; name: string } | null = null;
  try {
    const admin = await requireAdmin();

    outcome = await prisma.$transaction(async (tx) => {
      const app = await tx.creatorApplication.findUnique({
        where: { id: String(applicationId) },
        include: { user: { select: { id: true, role: true, email: true, name: true } } },
      });
      if (!app) throw new DecisionError("Application not found.");
      if (app.status !== "PENDING") throw new DecisionError(`This application is already ${app.status.toLowerCase()}.`);

      if (await tx.creator.findUnique({ where: { userId: app.userId }, select: { id: true } })) {
        throw new DecisionError("This person already has a creator profile.");
      }

      const moved = await tx.creatorApplication.updateMany({
        where: { id: app.id, status: "PENDING" },
        data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: admin.id, rejectionReason: null },
      });
      if (moved.count === 0) throw new DecisionError("This application was just handled by someone else.");

      const root = slugifyName(app.displayName) || "creator";
      let slug = root;
      for (let attempt = 0; attempt < 5; attempt++) {
        const taken = RESERVED_CREATOR_SLUGS.includes(slug) || !!(await tx.creator.findUnique({ where: { slug }, select: { id: true } }));
        if (!taken) break;
        slug = `${root}-${Math.random().toString(36).slice(2, 6)}`;
      }

      await tx.creator.create({
        data: {
          userId: app.userId,
          slug,
          displayName: app.displayName,
          track: app.track,
          bio: app.bio,
          specialties: app.specialties,
          location: app.location,
          links: app.portfolioLinks,
        },
      });

      if (PROMOTABLE_ROLES.includes(app.user.role)) {
        await tx.user.update({ where: { id: app.userId }, data: { role: "CREATOR" } });
      }

      return { slug, email: app.user.email, name: app.displayName };
    });
  } catch (err) {
    return failure(err, "approval");
  }

  revalidateAll(outcome.slug);
  await notifyCreatorDecision({ decision: "APPROVED", email: outcome.email, name: outcome.name, slug: outcome.slug, reason: null });
  return { success: true };
}

/** Rejects a pending application, with an optional reason the applicant will see. */
export async function rejectCreatorApplication(applicationId: string, reason?: string): Promise<CreatorAdminResult> {
  let outcome: { email: string; name: string; reason: string | null } | null = null;
  try {
    const admin = await requireAdmin();
    const cleanReason = (reason ?? "").trim().slice(0, CREATOR_LIMITS.reasonMax) || null;

    const app = await prisma.creatorApplication.findUnique({
      where: { id: String(applicationId) },
      include: { user: { select: { email: true } } },
    });
    if (!app) return { error: "Application not found." };
    if (app.status !== "PENDING") return { error: `This application is already ${app.status.toLowerCase()}.` };

    const moved = await prisma.creatorApplication.updateMany({
      where: { id: app.id, status: "PENDING" },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: admin.id, rejectionReason: cleanReason },
    });
    if (moved.count === 0) return { error: "This application was just handled by someone else." };
    outcome = { email: app.user.email, name: app.displayName, reason: cleanReason };
  } catch (err) {
    return failure(err, "rejection");
  }

  revalidateAll();
  revalidatePath("/creators/apply");
  await notifyCreatorDecision({ decision: "REJECTED", email: outcome.email, name: outcome.name, slug: null, reason: outcome.reason });
  return { success: true };
}

/** Pause or resume a creator. A paused profile disappears from the public pages; nothing is deleted. */
export async function setCreatorStatus(creatorId: string, status: string): Promise<CreatorAdminResult> {
  try {
    await requireAdmin();
    if (status !== "ACTIVE" && status !== "PAUSED") return { error: "Invalid status." };
    const creator = await prisma.creator.findUnique({ where: { id: String(creatorId) }, select: { id: true, slug: true } });
    if (!creator) return { error: "Creator not found." };
    await prisma.creator.update({ where: { id: creator.id }, data: { status } });
    revalidateAll(creator.slug);
    return { success: true };
  } catch (err) {
    return failure(err, "status change");
  }
}
