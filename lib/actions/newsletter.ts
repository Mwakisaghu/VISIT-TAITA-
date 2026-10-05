"use server";

import { cancelPendingCampaignEmails } from "@/lib/newsletter-maintenance";
import { prisma } from "@/lib/prisma";

export type TokenResult = { ok: true; already?: boolean } | { ok: false; error: string };

/**
 * Confirms a subscription from the link in the email. Only a PENDING subscription can be confirmed: a link from an old
 * signup can never resurrect someone who has since unsubscribed.
 */
export async function confirmSubscription(token: string): Promise<TokenResult> {
  const t = String(token ?? "");
  if (!t || t.length > 64) return { ok: false, error: "This link isn't valid." };

  const sub = await prisma.newsletterSubscriber.findUnique({ where: { token: t }, select: { id: true, status: true, confirmedAt: true } });
  if (!sub) return { ok: false, error: "This link isn't valid or has already been used." };
  if (sub.status === "ACTIVE" && sub.confirmedAt) return { ok: true, already: true };
  if (sub.status === "UNSUBSCRIBED") return { ok: false, error: "You've unsubscribed, so this link no longer works. You're welcome to sign up again." };

  const moved = await prisma.newsletterSubscriber.updateMany({
    where: { id: sub.id, status: { in: ["PENDING", "ACTIVE"] } },
    data: { status: "ACTIVE", confirmedAt: new Date(), unsubscribedAt: null },
  });
  return moved.count > 0 ? { ok: true } : { ok: false, error: "This link isn't valid or has already been used." };
}

/** Unsubscribes by the secret in any newsletter. Idempotent, and cancels anything already queued for that address. */
export async function unsubscribeWithToken(token: string): Promise<TokenResult> {
  const t = String(token ?? "");
  if (!t || t.length > 64) return { ok: false, error: "This link isn't valid." };

  const sub = await prisma.newsletterSubscriber.findUnique({ where: { token: t }, select: { id: true, email: true, status: true } });
  if (!sub) return { ok: false, error: "This link isn't valid." };

  if (sub.status !== "UNSUBSCRIBED") {
    await prisma.newsletterSubscriber.update({ where: { id: sub.id }, data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() } });
  }
  await cancelPendingCampaignEmails(prisma, sub.email);
  return { ok: true, already: sub.status === "UNSUBSCRIBED" };
}
