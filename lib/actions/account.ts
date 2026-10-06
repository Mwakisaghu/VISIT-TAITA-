"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { getDeletionBlockers } from "@/lib/account-data";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { cancelPendingCampaignEmails } from "@/lib/newsletter-maintenance";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { deleteUnusedUploads } from "@/lib/uploads/cleanup";
import { getStorage } from "@/lib/uploads/storage";

export type AccountResult = { success?: true; error?: string };

const HOUR_MS = 60 * 60 * 1000;

/**
 * Permanently deletes the signed-in person's account.
 *
 * A bare `user.delete()` would be wrong here, because several relations CASCADE and would destroy things that must
 * not simply vanish. So, in ONE transaction (all or nothing):
 *   - mission spots held by their creator claims are GIVEN BACK (otherwise they'd be consumed forever);
 *   - issued vouchers are cancelled and any limited reward stock is RESTORED;
 *   - their enquiries are ANONYMISED (the count and status stay for the host; the person's details go);
 *   - their shop orders are KEPT but anonymised (buyer unlinked, phone and address wiped) — payment records
 *     may be needed for accounting;
 *   - their newsletter subscription is removed;
 *   - then the account is deleted, which cascades their Passport, reviews, creator profile and Field Notes.
 * Stories they wrote stay on the site without their name (that relation is SetNull).
 *
 * They must re-enter their password (a stolen session alone can't erase an account), and accounts with open orders,
 * listings/products/rewards, or staff roles are refused with a reason — see getDeletionBlockers.
 */
export async function deleteMyAccount(password: string): Promise<AccountResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Please sign in." };
  const userId = session.user.id;

  if (!rateLimit(`delete-account:${userId}`, 5, HOUR_MS)) {
    return { error: "Too many attempts — please try again later." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, passwordHash: true },
  });
  if (!user) return { error: "This account no longer exists." };

  if (typeof password !== "string" || password.length === 0 || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "That password isn't right." };
  }

  const blockers = await getDeletionBlockers({ id: user.id, role: user.role });
  if (blockers.length > 0) return { error: blockers.join(" ") };

  // Their uploaded pictures: remember which, so the FILES can be removed once the account is gone.
  const myUploads = await prisma.uploadedImage.findMany({ where: { uploaderId: user.id }, select: { id: true, key: true, url: true } });

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Give back the mission spots their (non-withdrawn) claims were holding.
      const claims = await tx.missionClaim.findMany({
        where: { creator: { userId: user.id }, status: { not: "WITHDRAWN" } },
        select: { missionId: true },
      });
      const spots = new Map<string, number>();
      for (const c of claims) spots.set(c.missionId, (spots.get(c.missionId) ?? 0) + 1);
      for (const [missionId, n] of spots) {
        await tx.mission.updateMany({ where: { id: missionId, spotsTaken: { gte: n } }, data: { spotsTaken: { decrement: n } } });
      }

      // 2. Unused vouchers are cancelled with the account, so put limited stock back.
      const issued = await tx.rewardRedemption.findMany({ where: { userId: user.id, status: "ISSUED" }, select: { rewardId: true } });
      const restock = new Map<string, number>();
      for (const r of issued) restock.set(r.rewardId, (restock.get(r.rewardId) ?? 0) + 1);
      for (const [rewardId, n] of restock) {
        await tx.reward.updateMany({ where: { id: rewardId, stock: { not: null } }, data: { stock: { increment: n } } });
      }

      // 3. Enquiries: keep the record (and its status), remove the person.
      const removed = { name: "Deleted user", email: "deleted-user@invalid.example", phone: "removed", message: "[Removed at the person's request]" };
      await tx.accommodationEnquiry.updateMany({ where: { userId: user.id }, data: removed });
      await tx.experienceEnquiry.updateMany({ where: { userId: user.id }, data: removed });

      // 4. Orders are payment records: keep them, wipe the personal fields and unlink the buyer.
      await tx.order.updateMany({ where: { buyerId: user.id }, data: { buyerId: null, phone: "REDACTED", address: null } });

      // 5. The newsletter subscription (it is keyed by email).
      await tx.newsletterSubscriber.deleteMany({ where: { email: user.email } });
      await cancelPendingCampaignEmails(tx, user.email); // a deleted account must not receive a newsletter that was already queued

      // 6. The administrative record keeps WHAT was done, but their email address is removed from it.
      await tx.adminAuditLog.updateMany({ where: { targetUserId: user.id }, data: { targetEmail: null } });

      // 7. The account itself — cascades the Passport, reviews, creator profile, claims and Field Notes.
      await tx.user.delete({ where: { id: user.id } });
    });
  } catch (err) {
    console.error("[account] deletion failed", err);
    return { error: "We couldn't delete your account just now, and nothing was changed. Please try again, or contact us." };
  }

  // Public pages that may have shown their profile or notes.
  for (const path of ["/", "/creators", "/notes", "/missions", "/admin"]) revalidatePath(path);

  // Delete their pictures (best effort; one still used by something that stays on the site is left, and the weekly clean-up
  // removes it once nothing uses it). The account is already gone either way.
  try {
    const storage = getStorage();
    if (storage.driver) await deleteUnusedUploads(prisma, storage.driver, myUploads);
  } catch (err) {
    console.error("[account] couldn't delete uploaded pictures", err);
  }

  // Best effort, after the fact. The address is only used for this one message.
  await sendEmail({
    to: user.email,
    subject: "Your Visit Taita account has been deleted",
    text: [
      `Hi ${user.name},`,
      "",
      "As you asked, your Visit Taita account and the data linked to it have been deleted.",
      "Shop orders are kept as anonymous payment records, and any stories you wrote stay on the site without your name.",
      "",
      "If this wasn't you, please contact us straight away.",
    ].join("\n"),
  });

  return { success: true };
}

/** Removes the signed-in person's newsletter subscription (withdrawing consent). */
export async function unsubscribeNewsletter(): Promise<AccountResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Please sign in." };
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
  if (!user) return { error: "This account no longer exists." };
  // Keep the row as a do-not-email record (so they can't be re-added by accident) and cancel anything already queued for them.
  await prisma.newsletterSubscriber.updateMany({ where: { email: user.email, status: { not: "UNSUBSCRIBED" } }, data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() } });
  await cancelPendingCampaignEmails(prisma, user.email);
  revalidatePath("/account");
  return { success: true };
}
