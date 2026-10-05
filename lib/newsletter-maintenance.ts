import { PENDING_MAX_AGE_DAYS } from "@/lib/newsletter";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

// Works with the normal client or a transaction client.
type Db = Pick<typeof prisma, "emailLog">;

/**
 * Someone who has unsubscribed (or deleted their account) must not still receive a newsletter that was already queued for
 * them. Removes that address's still-pending campaign emails.
 */
export async function cancelPendingCampaignEmails(db: Db, email: string): Promise<number> {
  const res = await db.emailLog.deleteMany({ where: { campaignId: { not: null }, status: "PENDING", to: { has: email } } });
  return res.count;
}

/** Deletes signups that never confirmed within PENDING_MAX_AGE_DAYS. Called from the cron endpoint. */
export async function purgeStaleSubscribers(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - PENDING_MAX_AGE_DAYS * DAY_MS);
  const res = await prisma.newsletterSubscriber.deleteMany({ where: { status: "PENDING", createdAt: { lt: cutoff } } });
  return res.count;
}
