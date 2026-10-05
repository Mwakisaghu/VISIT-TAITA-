"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { ADMIN_ROLES, authOptions } from "@/lib/auth";
import { checkinBaseUrl, isLocalUrl } from "@/lib/checkin-url";
import { emailConfigured, sendEmail } from "@/lib/email";
import { processDueEmails } from "@/lib/email-outbox";
import { isTestSender } from "@/lib/email-retry";
import {
  confirmUrl,
  confirmationText,
  newsletterText,
  normalizeBody,
  normalizeSubject,
  unsubscribeApiUrl,
  unsubscribePageUrl,
  validateCampaign,
} from "@/lib/newsletter";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { readSiteInfo } from "@/lib/site-info";

export type NewsletterAdminResult = { success?: true; id?: string; message?: string; error?: string };

class SendError extends Error {}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) throw new Error("Admin access required.");
  return session.user;
}

function failure(err: unknown, what: string): NewsletterAdminResult {
  if (err instanceof SendError) return { error: err.message };
  if (err instanceof Error && /Admin access/.test(err.message)) return { error: "Admin access required." };
  console.error(`[newsletter] ${what} failed`, err);
  return { error: "Something went wrong — please try again." };
}

function refresh() {
  revalidatePath("/admin/newsletter");
  revalidatePath("/admin");
}

/**
 * Whether real subscribers can be mailed right now, and with what base URL. Sending is refused — with the reason — when
 * it would be pointless or harmful: no email configured; Resend's test sender (it only delivers to the account owner, so
 * every subscriber's email would bounce and burn its retries); or a non-public site address (the unsubscribe links in
 * every email would be broken).
 */
function sendReadiness(): { ok: true; base: string } | { ok: false; error: string } {
  if (!emailConfigured()) return { ok: false, error: "Email isn't configured (RESEND_API_KEY / EMAIL_FROM), so nothing can be sent." };
  if (isTestSender(process.env.EMAIL_FROM)) {
    return { ok: false, error: "You're still using Resend's test sender, which only delivers to your own address. Verify your domain and set EMAIL_FROM to an address on it first." };
  }
  const base = checkinBaseUrl();
  if (!base || isLocalUrl(base)) {
    return { ok: false, error: "NEXT_PUBLIC_APP_URL must be your public address, so the unsubscribe link in every email works." };
  }
  return { ok: true, base };
}

const newToken = () => randomBytes(12).toString("base64url");

/** createMany in chunks, so a big list can't exceed the database's parameter limit. */
async function createInChunks<T>(rows: T[], create: (chunk: T[]) => Promise<unknown>, size = 500) {
  for (let i = 0; i < rows.length; i += size) await create(rows.slice(i, i + size));
}

/** Creates or updates a DRAFT. A campaign that has been sent can no longer be edited. */
export async function saveCampaign(id: string | null, formData: FormData): Promise<NewsletterAdminResult> {
  try {
    const admin = await requireAdmin();
    const subject = normalizeSubject(String(formData.get("subject") ?? ""));
    const body = normalizeBody(String(formData.get("body") ?? ""));
    const invalid = validateCampaign(subject, body);
    if (invalid) return { error: invalid };

    if (id) {
      const existing = await prisma.newsletterCampaign.findUnique({ where: { id }, select: { id: true, startedAt: true } });
      if (!existing) return { error: "Newsletter not found." };
      if (existing.startedAt) return { error: "This newsletter has already been sent, so it can't be edited." };
      await prisma.newsletterCampaign.update({ where: { id }, data: { subject, body } });
      refresh();
      return { success: true, id };
    }
    const created = await prisma.newsletterCampaign.create({ data: { subject, body, createdById: admin.id }, select: { id: true } });
    refresh();
    return { success: true, id: created.id };
  } catch (err) {
    return failure(err, "save");
  }
}

/** Only a draft can be deleted — a sent newsletter is a record of what was mailed. */
export async function deleteCampaign(id: string): Promise<NewsletterAdminResult> {
  try {
    await requireAdmin();
    const found = await prisma.newsletterCampaign.findUnique({ where: { id: String(id) }, select: { id: true, startedAt: true } });
    if (!found) return { error: "Newsletter not found." };
    if (found.startedAt) return { error: "A sent newsletter can't be deleted." };
    await prisma.newsletterCampaign.delete({ where: { id: found.id } });
    refresh();
    return { success: true };
  } catch (err) {
    return failure(err, "delete");
  }
}

/** Sends the subject and body being edited to the admin's OWN address, clearly marked as a test. Nobody else is emailed. */
export async function sendTestNewsletter(formData: FormData): Promise<NewsletterAdminResult> {
  try {
    const admin = await requireAdmin();
    const to = admin.email;
    if (!to) return { error: "Your account has no email address to send the test to." };
    if (!emailConfigured()) return { error: "Email isn't configured (RESEND_API_KEY / EMAIL_FROM), so nothing can be sent." };
    if (!rateLimit(`newsletter-test:${admin.id}`, 10, 60 * 60 * 1000)) return { error: "Too many test sends — please wait a little." };

    const subject = normalizeSubject(String(formData.get("subject") ?? ""));
    const body = normalizeBody(String(formData.get("body") ?? ""));
    const invalid = validateCampaign(subject, body);
    if (invalid) return { error: invalid };

    const result = await sendEmail({ to, subject: `[TEST] ${subject}`, text: newsletterText({ body, info: readSiteInfo(), unsubscribeUrl: null }) });
    if (result.skipped) return { error: "The test couldn't be sent." };
    return { success: true, message: result.ok ? `Test sent to ${to}.` : `The test is queued and will be retried (to ${to}).` };
  } catch (err) {
    return failure(err, "test send");
  }
}

/**
 * Sends a draft to every CONFIRMED subscriber, exactly once.
 *
 * Claiming the campaign (startedAt) and creating one outbox email per recipient happen in ONE transaction, with the claim
 * as a conditional update — so a double-click, two admins, or a retry can never send it twice. Each recipient's email
 * carries their own unsubscribe link and the one-click List-Unsubscribe headers. Delivery, retries and progress then come
 * from the email outbox; the first batch is sent straight away and the rest by the cron endpoint or "Send next batch".
 */
export async function sendCampaign(id: string): Promise<NewsletterAdminResult> {
  try {
    await requireAdmin();
    const ready = sendReadiness();
    if (!ready.ok) return { error: ready.error };
    const base = ready.base;

    const campaign = await prisma.newsletterCampaign.findUnique({ where: { id: String(id) }, select: { id: true, subject: true, body: true, startedAt: true } });
    if (!campaign) return { error: "Newsletter not found." };
    if (campaign.startedAt) return { error: "This newsletter has already been sent." };

    const info = readSiteInfo();
    const now = new Date();
    let count = 0;

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.newsletterCampaign.updateMany({ where: { id: campaign.id, startedAt: null }, data: { startedAt: now } });
      if (claimed.count === 0) throw new SendError("This newsletter was just sent by someone else.");

      // Read the recipients INSIDE the transaction, as late as possible, so anyone who has just unsubscribed isn't included.
      const recipients = await tx.newsletterSubscriber.findMany({
        where: { status: "ACTIVE", confirmedAt: { not: null }, token: { not: null } },
        select: { email: true, token: true },
      });
      if (recipients.length === 0) throw new SendError("There are no confirmed subscribers to send to yet.");
      count = recipients.length;

      await tx.newsletterCampaign.update({ where: { id: campaign.id }, data: { recipientCount: count } });
      await createInChunks(recipients, (chunk) =>
        tx.emailLog.createMany({
          data: chunk.map((r) => ({
            to: [r.email],
            subject: campaign.subject,
            body: newsletterText({ body: campaign.body, info, unsubscribeUrl: unsubscribePageUrl(base, r.token as string) }),
            unsubscribeUrl: unsubscribeApiUrl(base, r.token as string),
            campaignId: campaign.id,
            status: "PENDING" as const,
            attempts: 0,
            nextAttemptAt: now,
          })),
        })
      );
    });

    // Start delivering right away; if this fails the cron endpoint or "Send next batch" carries on.
    try {
      await processDueEmails(25);
    } catch (err) {
      console.error("[newsletter] first batch failed", err);
    }
    refresh();
    return { success: true, message: `Queued for ${count} subscriber${count === 1 ? "" : "s"}. The first batch is on its way; the rest follow automatically.` };
  } catch (err) {
    return failure(err, "send");
  }
}

/**
 * Subscribers from before confirmation existed were never verified, so they are NOT mailed. This asks them to confirm
 * (up to 200 at a time) by emailing each a confirmation link; anyone who doesn't confirm is simply never mailed.
 */
export async function requestReconfirmation(): Promise<NewsletterAdminResult> {
  try {
    await requireAdmin();
    const ready = sendReadiness();
    if (!ready.ok) return { error: ready.error };
    const base = ready.base;
    const now = new Date();

    const legacy = await prisma.newsletterSubscriber.findMany({ where: { status: "ACTIVE", confirmedAt: null }, take: 200, select: { id: true, email: true, token: true } });
    if (legacy.length === 0) return { success: true, message: "Nobody is waiting to be asked." };

    const rows: { email: string; token: string }[] = [];
    await prisma.$transaction(async (tx) => {
      for (const s of legacy) {
        const token = s.token ?? newToken();
        const moved = await tx.newsletterSubscriber.updateMany({ where: { id: s.id, status: "ACTIVE", confirmedAt: null }, data: { status: "PENDING", token } });
        if (moved.count > 0) rows.push({ email: s.email, token });
      }
      await createInChunks(rows, (chunk) =>
        tx.emailLog.createMany({
          data: chunk.map((r) => ({
            to: [r.email],
            subject: "Please confirm your Visit Taita newsletter subscription",
            body: confirmationText(confirmUrl(base, r.token)),
            unsubscribeUrl: unsubscribeApiUrl(base, r.token),
            status: "PENDING" as const,
            attempts: 0,
            nextAttemptAt: now,
          })),
        })
      );
    });

    try {
      await processDueEmails(25);
    } catch (err) {
      console.error("[newsletter] first reconfirmation batch failed", err);
    }
    const remaining = await prisma.newsletterSubscriber.count({ where: { status: "ACTIVE", confirmedAt: null } });
    refresh();
    return { success: true, message: `Asked ${rows.length} subscriber${rows.length === 1 ? "" : "s"} to confirm.${remaining > 0 ? ` ${remaining} more to go — press the button again.` : ""}` };
  } catch (err) {
    return failure(err, "reconfirmation");
  }
}
