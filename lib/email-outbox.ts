import { deliverEmail, emailConfigured } from "@/lib/email";
import { recordOutcome } from "@/lib/email-record";
import { BODY_RETENTION_DAYS, LEASE_MS, ROW_RETENTION_DAYS } from "@/lib/email-retry";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

<<<<<<< HEAD
type Row = { id: string; to: string[]; replyTo: string | null; subject: string; body: string | null; attempts: number; unsubscribeUrl: string | null };
=======
type Row = { id: string; to: string[]; replyTo: string | null; subject: string; body: string | null; attempts: number };
>>>>>>> 48c0a62 (Emails)
export type AttemptOutcome = "sent" | "retry" | "gaveUp" | "skipped" | "error";

/**
 * One retry of one row. The row is first "leased" with a conditional update (its due time is pushed out), so two
 * workers — or a worker and an admin's button — can't both send it; whoever loses the update does nothing. The
 * outbox row id doubles as the provider's idempotency key, so even a lost lease can't deliver twice.
 */
async function attemptRow(row: Row, now: Date): Promise<AttemptOutcome> {
  const leased = await prisma.emailLog.updateMany({
    where: { id: row.id, status: "PENDING", nextAttemptAt: { lte: now } },
    data: { nextAttemptAt: new Date(now.getTime() + LEASE_MS) },
  });
  if (leased.count === 0) return "skipped";

  if (!row.body) {
    await prisma.emailLog.update({
      where: { id: row.id },
      data: { status: "FAILED", nextAttemptAt: null, lastError: "The message is no longer stored, so it can't be resent." },
    });
    return "gaveUp";
  }

<<<<<<< HEAD
  const result = await deliverEmail({ to: row.to, replyTo: row.replyTo, subject: row.subject, text: row.body, unsubscribeUrl: row.unsubscribeUrl }, `email-${row.id}`);
=======
  const result = await deliverEmail({ to: row.to, replyTo: row.replyTo, subject: row.subject, text: row.body }, `email-${row.id}`);
>>>>>>> 48c0a62 (Emails)
  return recordOutcome(row.id, row.attempts, result, now);
}

export type DueSummary = { configured: boolean; due: number; sent: number; retrying: number; gaveUp: number };

/** Retries every email whose time has come (oldest first, up to `limit`). Used by the cron endpoint and the admin button. */
export async function processDueEmails(limit = 20, now: Date = new Date()): Promise<DueSummary> {
  const summary: DueSummary = { configured: emailConfigured(), due: 0, sent: 0, retrying: 0, gaveUp: 0 };
  // Without a sender, trying would just burn attempts — leave everything exactly as it is.
  if (!summary.configured) return summary;

  const rows = await prisma.emailLog.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: now } },
    orderBy: { nextAttemptAt: "asc" },
    take: Math.max(1, Math.min(limit, 100)),
<<<<<<< HEAD
    select: { id: true, to: true, replyTo: true, subject: true, body: true, attempts: true, unsubscribeUrl: true },
=======
    select: { id: true, to: true, replyTo: true, subject: true, body: true, attempts: true },
>>>>>>> 48c0a62 (Emails)
  });
  summary.due = rows.length;

  for (const row of rows) {
    const outcome = await attemptRow(row, now);
    if (outcome === "sent") summary.sent++;
    else if (outcome === "retry") summary.retrying++;
    else if (outcome === "gaveUp") summary.gaveUp++;
  }
  return summary;
}

export type RetryOutcome = { ok: true; message: string } | { ok: false; error: string };

/**
 * Sends one email now, ignoring its schedule — for an admin who has just fixed the cause (verified a domain,
 * corrected EMAIL_FROM). Works on a retrying OR a given-up email, as long as its message is still stored.
 */
export async function retryEmailNow(id: string, now: Date = new Date()): Promise<RetryOutcome> {
  const row = await prisma.emailLog.findUnique({
    where: { id },
<<<<<<< HEAD
    select: { id: true, to: true, replyTo: true, subject: true, body: true, attempts: true, status: true, unsubscribeUrl: true },
=======
    select: { id: true, to: true, replyTo: true, subject: true, body: true, attempts: true, status: true },
>>>>>>> 48c0a62 (Emails)
  });
  if (!row) return { ok: false, error: "Email not found." };
  if (row.status === "SENT") return { ok: false, error: "That email was already delivered." };
  if (!row.body) return { ok: false, error: "The message is no longer stored, so it can't be resent." };
  if (!emailConfigured()) return { ok: false, error: "Email isn't configured (RESEND_API_KEY / EMAIL_FROM), so nothing can be sent." };

  // Take the lease (a given-up email becomes PENDING again while we try it).
  const leased = await prisma.emailLog.updateMany({
    where: { id: row.id, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "PENDING", nextAttemptAt: new Date(now.getTime() + LEASE_MS) },
  });
  if (leased.count === 0) return { ok: false, error: "That email was just handled." };

<<<<<<< HEAD
  const result = await deliverEmail({ to: row.to, replyTo: row.replyTo, subject: row.subject, text: row.body, unsubscribeUrl: row.unsubscribeUrl }, `email-${row.id}`);
=======
  const result = await deliverEmail({ to: row.to, replyTo: row.replyTo, subject: row.subject, text: row.body }, `email-${row.id}`);
>>>>>>> 48c0a62 (Emails)
  const outcome = await recordOutcome(row.id, row.attempts, result, now);
  if (outcome === "sent") return { ok: true, message: "Sent." };
  return { ok: false, error: result.error ?? "It still couldn't be sent." };
}

export type PurgeSummary = { expired: number; bodiesCleared: number; deleted: number };

/**
 * Housekeeping, so message contents (which can include an enquirer's details) aren't kept longer than needed:
 *  - unsent for 7 days -> given up, message cleared
 *  - given-up mail older than 7 days -> message cleared
 *  - every row older than 30 days -> deleted
 */
export async function purgeOldEmails(now: Date = new Date()): Promise<PurgeSummary> {
  const bodyCutoff = new Date(now.getTime() - BODY_RETENTION_DAYS * DAY_MS);
  const rowCutoff = new Date(now.getTime() - ROW_RETENTION_DAYS * DAY_MS);

  const expired = await prisma.emailLog.updateMany({
    where: { status: "PENDING", createdAt: { lt: bodyCutoff } },
    data: { status: "FAILED", body: null, nextAttemptAt: null, lastError: `Gave up: not delivered within ${BODY_RETENTION_DAYS} days.` },
  });
  const cleared = await prisma.emailLog.updateMany({
    where: { status: "FAILED", createdAt: { lt: bodyCutoff }, body: { not: null } },
    data: { body: null },
  });
  const deleted = await prisma.emailLog.deleteMany({ where: { createdAt: { lt: rowCutoff } } });
  return { expired: expired.count, bodiesCleared: cleared.count, deleted: deleted.count };
}
