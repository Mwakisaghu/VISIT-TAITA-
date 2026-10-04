"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { REVIEW_MAX_REASON } from "@/lib/reviews";

export type ReviewAdminResult = { success?: true; error?: string };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    throw new Error("Admin access required.");
  }
  return session.user;
}

function revalidateFor(review: {
  accommodation: { slug: string } | null;
  experience: { slug: string } | null;
}) {
  if (review.accommodation) revalidatePath(`/stay/listing/${review.accommodation.slug}`);
  if (review.experience) revalidatePath(`/experiences/listing/${review.experience.slug}`);
  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
}

const include = {
  accommodation: { select: { slug: true } },
  experience: { select: { slug: true } },
} as const;

/** Approve (publishes it on the listing page) or reject (optionally with a reason the author sees). */
export async function moderateReview(
  reviewId: string,
  decision: string,
  reason?: string
): Promise<ReviewAdminResult> {
  try {
    const admin = await requireAdmin();
    if (decision !== "APPROVED" && decision !== "REJECTED") return { error: "Invalid decision." };

    const cleanReason = (reason ?? "").trim().slice(0, REVIEW_MAX_REASON);
    const review = await prisma.review.findUnique({ where: { id: String(reviewId) }, include });
    if (!review) return { error: "Review not found." };

    await prisma.review.update({
      where: { id: review.id },
      data: {
        status: decision,
        rejectionReason: decision === "REJECTED" && cleanReason ? cleanReason : null,
        moderatedAt: new Date(),
        moderatedById: admin.id,
      },
    });
    revalidateFor(review);
    return { success: true };
  } catch (err) {
    if (err instanceof Error && /Admin access/.test(err.message)) return { error: "Admin access required." };
    console.error("[reviews] moderation failed", err);
    return { error: "Couldn't update the review — please try again." };
  }
}

export async function deleteReview(reviewId: string): Promise<ReviewAdminResult> {
  try {
    await requireAdmin();
    const review = await prisma.review.findUnique({ where: { id: String(reviewId) }, include });
    if (!review) return { error: "Review not found." };
    await prisma.review.delete({ where: { id: review.id } });
    revalidateFor(review);
    return { success: true };
  } catch (err) {
    if (err instanceof Error && /Admin access/.test(err.message)) return { error: "Admin access required." };
    console.error("[reviews] delete failed", err);
    return { error: "Couldn't delete the review — please try again." };
  }
}
