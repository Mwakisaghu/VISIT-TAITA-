// Minimal transactional email sender (Resend's REST API over fetch — no SDK), with an outbox.
//
// Design rules:
//  - sendEmail() NEVER throws. A mail outage or misconfiguration must not stop a lead or
//    enquiry from being saved.
//  - Every email is recorded in the outbox (EmailLog) before it is sent, so a failure is visible
//    and gets retried. If the outbox itself can't be written, the email is STILL sent — the outbox
//    must never make email less reliable than it was.
//  - Missing configuration is a quiet no-op ("skipped"), so dev works with no email setup at all
//    (and nothing is queued for a sender that doesn't exist).
//  - Plain text only: nothing user-supplied is ever rendered as HTML.
//  - Retries reuse an idempotency key (the outbox row id), so a retry after an unrecorded success
//    isn't delivered twice.
//
// Env (read at call time):
//   RESEND_API_KEY  API key from https://resend.com
//   EMAIL_FROM      e.g. "Visit Taita <hello@yourdomain>" (Resend's onboarding@resend.dev only delivers to YOU)
//   RESEND_API_URL  optional override (used by tests)

import { nextAttemptAfter } from "@/lib/email-retry";
import { recordOutcome } from "@/lib/email-record";
import { prisma } from "@/lib/prisma";

export type EmailResult = { ok: boolean; skipped?: boolean; error?: string };
export type EmailPayload = { to: string[]; replyTo?: string | null; subject: string; text: string };

const TIMEOUT_MS = 4000;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/;

export function isValidEmail(value: string) {
  return value.length <= 254 && EMAIL_RE.test(value);
}

/** Split a comma/semicolon/whitespace separated list; keep valid, unique, lowercased. */
export function parseRecipients(raw: string | null | undefined): string[] {
  const seen = new Set<string>();
  for (const part of String(raw ?? "").split(/[,;\s]+/)) {
    const email = part.trim().toLowerCase();
    if (email && isValidEmail(email)) seen.add(email);
  }
  return [...seen];
}

/** Header values must never carry line breaks. */
function cleanHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 200);
}

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

/** The provider's own explanation (Resend sends JSON with a "message"), flattened to one safe line. */
function describeFailure(status: number, rawBody: string): string {
  let detail = rawBody;
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed.message === "string") detail = parsed.message;
  } catch {
    // not JSON — use the raw text
  }
  detail = detail.replace(/\s+/g, " ").trim().slice(0, 240);
  return detail ? `HTTP ${status} — ${detail}` : `HTTP ${status}`;
}

let warnedUnconfigured = false;

/** One raw delivery attempt. No database involved, never throws. */
export async function deliverEmail(payload: EmailPayload, idempotencyKey?: string): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, skipped: true, error: "email not configured" };

  const body: Record<string, unknown> = {
    from,
    to: payload.to,
    subject: cleanHeader(payload.subject),
    text: payload.text,
  };
  if (payload.replyTo && isValidEmail(payload.replyTo.trim())) body.reply_to = payload.replyTo.trim();

  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const error = describeFailure(res.status, await res.text().catch(() => ""));
      console.error(`[email] send failed: ${error}`);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error(`[email] send failed: ${message}`);
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendEmail(input: {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const to = parseRecipients(Array.isArray(input.to) ? input.to.join(",") : input.to);
  if (to.length === 0) return { ok: false, skipped: true, error: "no valid recipients" };

  if (!emailConfigured()) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn("[email] RESEND_API_KEY / EMAIL_FROM not set — notification emails are skipped.");
    }
    return { ok: false, skipped: true, error: "email not configured" };
  }

  const payload: EmailPayload = {
    to,
    replyTo: input.replyTo && isValidEmail(input.replyTo.trim()) ? input.replyTo.trim() : null,
    subject: cleanHeader(input.subject),
    text: input.text,
  };

  // 1. Record the intent first, so a crash or outage can't lose it. If this fails, send anyway.
  let logId: string | null = null;
  try {
    const row = await prisma.emailLog.create({
      data: {
        to: payload.to,
        replyTo: payload.replyTo,
        subject: payload.subject,
        body: payload.text,
        status: "PENDING",
        attempts: 0,
        nextAttemptAt: nextAttemptAfter(1, new Date()),
      },
      select: { id: true },
    });
    logId = row.id;
  } catch (err) {
    console.error("[email] couldn't record to the outbox — sending without it", err instanceof Error ? err.message : err);
  }

  // 2. Try now. 3. Record what happened (never throws).
  const result = await deliverEmail(payload, logId ? `email-${logId}` : undefined);
  if (logId) await recordOutcome(logId, 0, result);
  return result;
}
