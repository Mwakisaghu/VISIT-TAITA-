// Minimal transactional email sender (Resend's REST API over fetch — no SDK).
//
// Design rules:
//  - sendEmail() NEVER throws. A mail outage or misconfiguration must not
//    stop a lead or enquiry from being saved.
//  - Missing configuration is a quiet no-op ("skipped"), so dev works with
//    no email setup at all.
//  - Plain text only: nothing user-supplied is ever rendered as HTML.
//
// Env (read at call time):
//   RESEND_API_KEY  API key from https://resend.com
//   EMAIL_FROM      e.g. "Visit Taita <onboarding@resend.dev>" (or your verified domain)
//   RESEND_API_URL  optional override (used by tests)

export type EmailResult = { ok: boolean; skipped?: boolean; error?: string };

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

let warnedUnconfigured = false;

export async function sendEmail(input: {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const to = parseRecipients(Array.isArray(input.to) ? input.to.join(",") : input.to);
  if (to.length === 0) return { ok: false, skipped: true, error: "no valid recipients" };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn("[email] RESEND_API_KEY / EMAIL_FROM not set — notification emails are skipped.");
    }
    return { ok: false, skipped: true, error: "email not configured" };
  }

  const body: Record<string, unknown> = {
    from,
    to,
    subject: cleanHeader(input.subject),
    text: input.text,
  };
  if (input.replyTo && isValidEmail(input.replyTo.trim())) body.reply_to = input.replyTo.trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      console.error(`[email] send failed: HTTP ${res.status} ${detail}`);
      return { ok: false, error: `HTTP ${res.status}` };
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
