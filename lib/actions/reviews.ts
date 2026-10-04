"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notifyNewReview } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import {
  REVIEW_MAX_BODY,
  REVIEW_MAX_TITLE,
  REVIEW_MIN_BODY,
  isReviewKind,
  type ReviewKind,
} from "@/lib/reviews";

export type ReviewResult = { success?: true; error?: string };

export type MyReviewState = {
  /** false when the visitor can't write one (not signed in, owns the listing, …) */
  canReview: boolean;
  reason?: "signin" | "own" | "unavailable";
  review?: {
    rating: number;
    title: string | null;
    body: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    rejectionReason: string | null;
    verified: boolean;
  } | null;
};

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(REVIEW_MAX_TITLE).optional().or(z.literal("")),
  body: z.string().trim().min(REVIEW_MIN_BODY).max(REVIEW_MAX_BODY),
});

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

async function loadListing(kind: ReviewKind, id: string) {
  const args = {
    where: { id, status: "PUBLISHED" as const },
    select: { id: true, name: true, slug: true, ownerId: true },
  };
  return kind === "accommodation"
    ? prisma.accommodation.findFirst(args)
    : prisma.experience.findFirst(args);
}

async function findMyReview(kind: ReviewKind, userId: string, listingId: string) {
  return kind === "accommodation"
    ? prisma.review.findUnique({ where: { userId_accommodationId: { userId, accommodationId: listingId } } })
    : prisma.review.findUnique({ where: { userId_experienceId: { userId, experienceId: listingId } } });
}

/** "Verified guest": the author has an enquiry for this listing that staff marked CONFIRMED. */
async function hasConfirmedEnquiry(kind: ReviewKind, userId: string, listingId: string) {
  const found =
    kind === "accommodation"
      ? await prisma.accommodationEnquiry.findFirst({
          where: { accommodationId: listingId, userId, status: "CONFIRMED" },
          select: { id: true },
        })
      : await prisma.experienceEnquiry.findFirst({
          where: { experienceId: listingId, userId, status: "CONFIRMED" },
          select: { id: true },
        });
  return !!found;
}

function listingPath(kind: ReviewKind, slug: string) {
  return kind === "accommodation" ? `/stay/listing/${slug}` : `/experiences/listing/${slug}`;
}

function toState(review: Awaited<ReturnType<typeof findMyReview>>): MyReviewState["review"] {
  if (!review) return null;
  return {
    rating: review.rating,
    title: review.title,
    body: review.body,
    status: review.status,
    rejectionReason: review.rejectionReason,
    verified: review.verified,
  };
}

/** What the signed-in visitor can do on this listing (loaded on the client so the page stays cacheable). */
export async function getMyReviewState(kind: ReviewKind, listingId: string): Promise<MyReviewState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { canReview: false, reason: "signin" };
  if (!isReviewKind(kind)) return { canReview: false, reason: "unavailable" };

  const listing = await loadListing(kind, String(listingId));
  if (!listing) return { canReview: false, reason: "unavailable" };
  if (listing.ownerId === session.user.id) return { canReview: false, reason: "own" };

  const mine = await findMyReview(kind, session.user.id, listing.id);
  return { canReview: true, review: toState(mine) };
}

/** Creates the visitor's review, or edits it (an edit sends it back for approval). */
export async function submitReview(
  kind: ReviewKind,
  listingId: string,
  formData: FormData
): Promise<ReviewResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Please sign in to write a review." };
  const userId = session.user.id;

  if (!isReviewKind(kind)) return { error: "This listing isn't available for reviews." };

  if (!rateLimit(`review:${userId}`, 5, 60 * 60 * 1000)) {
    return { error: "You've submitted several reviews recently — please try again later." };
  }

  const parsed = reviewSchema.safeParse({
    rating: formData.get("rating"),
    title: formData.get("title") ?? "",
    body: formData.get("body"),
  });
  if (!parsed.success) {
    const fields = new Set(parsed.error.issues.map((i) => String(i.path[0])));
    if (fields.has("rating")) return { error: "Please choose a rating from 1 to 5 stars." };
    if (fields.has("body")) {
      return { error: `Please write between ${REVIEW_MIN_BODY} and ${REVIEW_MAX_BODY} characters about your experience.` };
    }
    return { error: `Keep the headline under ${REVIEW_MAX_TITLE} characters.` };
  }
  const { rating, body } = parsed.data;
  const title = parsed.data.title || null;

  const listing = await loadListing(kind, String(listingId));
  if (!listing) return { error: "This listing isn't available for reviews." };
  if (listing.ownerId === userId) return { error: "You can't review your own listing." };

  const verified = await hasConfirmedEnquiry(kind, userId, listing.id);
  const existing = await findMyReview(kind, userId, listing.id);

  try {
    if (existing) {
      // Any edit goes back through moderation, so an approved review can't be swapped for something else.
      await prisma.review.update({
        where: { id: existing.id },
        data: {
          rating,
          title,
          body,
          verified,
          status: "PENDING",
          rejectionReason: null,
          moderatedAt: null,
          moderatedById: null,
        },
      });
    } else {
      await prisma.review.create({
        data: {
          userId,
          ...(kind === "accommodation" ? { accommodationId: listing.id } : { experienceId: listing.id }),
          rating,
          title,
          body,
          verified,
        },
      });
    }
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "You've already reviewed this — refresh the page to edit your review." };
    }
    throw err;
  }

  revalidatePath(listingPath(kind, listing.slug));
  revalidatePath("/admin/reviews");
  revalidatePath("/admin");

  // Saved first — a mail failure must never lose a review.
  await notifyNewReview({
    kind,
    listingName: listing.name,
    rating,
    title,
    body,
    verified,
    reviewerName: session.user.name ?? null,
    edited: !!existing,
  });

  return { success: true };
}

/** Removes the visitor's own review. */
export async function deleteMyReview(kind: ReviewKind, listingId: string): Promise<ReviewResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Please sign in." };
  if (!isReviewKind(kind)) return { error: "Review not found." };

  const mine = await findMyReview(kind, session.user.id, String(listingId));
  if (!mine) return { error: "Review not found." };

  await prisma.review.delete({ where: { id: mine.id } });

  const listing = await loadListing(kind, String(listingId));
  if (listing) revalidatePath(listingPath(kind, listing.slug));
  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  return { success: true };
}
