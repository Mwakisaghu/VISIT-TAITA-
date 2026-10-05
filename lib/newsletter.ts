// Pure newsletter rules (no Node-only imports, safe anywhere).
import { controllerName, type SiteInfo } from "@/lib/site-info";

export const NEWSLETTER_LIMITS = { subjectMin: 3, subjectMax: 150, bodyMin: 20, bodyMax: 20000 } as const;

/** A signup that never confirms is deleted after this long: we shouldn't keep unverified addresses indefinitely. */
export const PENDING_MAX_AGE_DAYS = 30;

export type SubscriberLike = { status: string; confirmedAt: Date | null };

/** Only people who CONFIRMED their address are ever mailed. */
export const isSendable = (s: SubscriberLike) => s.status === "ACTIVE" && s.confirmedAt !== null;
/** Subscribed before confirmation existed: kept, but not mailed until they confirm. */
export const isLegacy = (s: SubscriberLike) => s.status === "ACTIVE" && s.confirmedAt === null;

const enc = encodeURIComponent;
/** The page a person lands on from the confirmation email. */
export const confirmUrl = (base: string, token: string) => `${base}/newsletter/confirm?token=${enc(token)}`;
/** The page behind the visible "Unsubscribe" link in the body. */
export const unsubscribePageUrl = (base: string, token: string) => `${base}/newsletter/unsubscribe?token=${enc(token)}`;
/** The one-click endpoint mail apps call (List-Unsubscribe-Post). */
export const unsubscribeApiUrl = (base: string, token: string) => `${base}/api/newsletter/unsubscribe?token=${enc(token)}`;

/** One tidy plain-text body: LF line endings, no control characters, no runs of blank lines, trimmed. */
export function normalizeBody(raw: string): string {
  return String(raw ?? "")
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function normalizeSubject(raw: string): string {
  return String(raw ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

export function validateCampaign(subject: string, body: string): string | null {
  const L = NEWSLETTER_LIMITS;
  if (subject.length < L.subjectMin || subject.length > L.subjectMax) return `The subject should be ${L.subjectMin}–${L.subjectMax} characters.`;
  if (body.length < L.bodyMin) return `Write at least ${L.bodyMin} characters.`;
  if (body.length > L.bodyMax) return `Keep it under ${L.bodyMax.toLocaleString("en-GB")} characters.`;
  return null;
}

/**
 * What a subscriber actually receives: the body, then a footer that says why they're getting it, how to stop, and who is
 * sending. `unsubscribeUrl: null` is for test sends only (there is no real subscriber to unsubscribe).
 */
export function newsletterText(opts: { body: string; info: SiteInfo; unsubscribeUrl: string | null }): string {
  const { body, info, unsubscribeUrl } = opts;
  const sender = [controllerName(info), info.address].filter(Boolean).join(", ");
  return [
    body,
    "",
    "—",
    "You're getting this because you subscribed to the Visit Taita letter.",
    unsubscribeUrl ? `Unsubscribe any time: ${unsubscribeUrl}` : "(This is a test send. Real emails carry each person's own unsubscribe link.)",
    sender,
  ].join("\n");
}

export function confirmationText(url: string): string {
  return [
    "Please confirm your Visit Taita newsletter subscription.",
    "",
    "Click this link to confirm:",
    url,
    "",
    "If you didn't ask for this, ignore this email — you won't be subscribed and we won't email you again.",
    "",
    "Visit Taita",
  ].join("\n");
}

/** "jo.visitor@mail.co.ke" -> "j***@mail.co.ke", so a page can say WHICH address without exposing it in full. */
export function maskEmail(email: string): string {
  const [local, domain] = String(email ?? "").split("@");
  if (!local || !domain) return "your address";
  return `${local[0]}***@${domain}`;
}
