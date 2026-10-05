import type { EmailResult } from "@/lib/email";
import { nextAttemptAfter } from "@/lib/email-retry";
import { prisma } from "@/lib/prisma";

/**
 * Writes the outcome of an attempt onto its outbox row. Success clears the stored message (we don't keep a
 * delivered email's contents). A failure schedules the next try, or — after the last — marks it FAILED but keeps
 * the message so it can still be retried by hand. Never throws: a bookkeeping problem must not undo a send.
 */
export async function recordOutcome(
  id: string,
  priorAttempts: number,
  result: EmailResult,
  now: Date = new Date()
): Promise<"sent" | "retry" | "gaveUp" | "error"> {
  const attempts = priorAttempts + 1;
  try {
    if (result.ok) {
      await prisma.emailLog.update({
        where: { id },
        data: { status: "SENT", attempts, body: null, sentAt: now, lastError: null, nextAttemptAt: null },
      });
      return "sent";
    }
    const lastError = (result.error ?? "unknown error").slice(0, 300);
    const next = nextAttemptAfter(attempts, now);
    await prisma.emailLog.update({
      where: { id },
      data: next
        ? { status: "PENDING", attempts, lastError, nextAttemptAt: next }
        : { status: "FAILED", attempts, lastError, nextAttemptAt: null },
    });
    return next ? "retry" : "gaveUp";
  } catch (err) {
    console.error("[email] couldn't update the outbox", err instanceof Error ? err.message : err);
    return "error";
  }
}
