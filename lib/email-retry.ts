// Pure rules for the email outbox (no Node-only imports).

/** Total tries before an email is marked FAILED (it can still be retried by hand). */
export const MAX_ATTEMPTS = 6;

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/** Wait before the next try, indexed by how many tries have failed so far (1 -> 5 min … 5 -> 12 h). */
export const BACKOFF_MS = [5 * MIN, 30 * MIN, 2 * HOUR, 6 * HOUR, 12 * HOUR];

/** While a retry is in flight its row is "leased" this long, so two workers can't send the same email. */
export const LEASE_MS = 10 * MIN;

/** Unsent message bodies are cleared after this long; every row is deleted after ROW_RETENTION_DAYS. */
export const BODY_RETENTION_DAYS = 7;
export const ROW_RETENTION_DAYS = 30;

/** When to try again after `failedAttempts` failures, or null when it's time to give up. */
export function nextAttemptAfter(failedAttempts: number, now: Date): Date | null {
  if (failedAttempts >= MAX_ATTEMPTS) return null;
  const delay = BACKOFF_MS[Math.min(Math.max(failedAttempts, 1), BACKOFF_MS.length) - 1];
  return new Date(now.getTime() + delay);
}

/** Resend's shared test sender only delivers to the account owner's own address. */
export function isTestSender(from: string | null | undefined): boolean {
  // The domain must END there (so "a@resend.dev.example.com" is not mistaken for it).
  return /@resend\.dev(?![A-Za-z0-9.-])/i.test(from ?? "");
}

export type EmailHealth = {
  /** RESEND_API_KEY and EMAIL_FROM are both set. */
  configured: boolean;
  /** EMAIL_FROM is Resend's test sender, so real recipients will be refused. */
  testSender: boolean;
  /** CRON_SECRET is set, so /api/cron/emails can run automatic retries. */
  cronEnabled: boolean;
};

export function emailHealth(env: Record<string, string | undefined>): EmailHealth {
  return {
    configured: !!env.RESEND_API_KEY && !!env.EMAIL_FROM,
    testSender: isTestSender(env.EMAIL_FROM),
    cronEnabled: !!env.CRON_SECRET,
  };
}

/** "in 30 minutes", "in 2 hours" — for the admin screen. */
export function describeWait(ms: number): string {
  if (ms <= 0) return "due now";
  const minutes = Math.round(ms / MIN);
  if (minutes < 60) return `in ${Math.max(1, minutes)} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(ms / HOUR);
  return `in ${hours} hour${hours === 1 ? "" : "s"}`;
}
