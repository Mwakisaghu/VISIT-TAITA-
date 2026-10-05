import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { processDueEmails, purgeOldEmails } from "@/lib/email-outbox";
import { purgeExpiredTokens } from "@/lib/account-tokens";
import { purgeStaleSubscribers } from "@/lib/newsletter-maintenance";

// Never cached: it does work every time it is called.
export const dynamic = "force-dynamic";

function matches(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Retries emails that are due and tidies old ones. Protected by CRON_SECRET: callers send
 * "Authorization: Bearer <CRON_SECRET>" (Vercel Cron does this automatically when CRON_SECRET is set).
 * With no secret configured the endpoint is switched OFF — it never runs unauthenticated. The response
 * carries counts only: no recipients, subjects or message text.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured, so this endpoint is disabled." }, { status: 503 });

  if (!matches(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const retried = await processDueEmails(50);
    const purged = await purgeOldEmails();
    // Unconfirmed newsletter signups are deleted after 30 days. If that fails it must never stop email retries.
    let staleSubscribers = 0;
    try {
      staleSubscribers = await purgeStaleSubscribers();
    } catch (err) {
      console.error("[cron/emails] couldn't purge stale subscribers", err);
    }
    // Expired verification and reset links are deleted too; again, a failure here never stops email retries.
    let expiredTokens = 0;
    try {
      expiredTokens = await purgeExpiredTokens();
    } catch (err) {
      console.error("[cron/emails] couldn't purge expired account tokens", err);
    }
    return NextResponse.json({ ok: true, retried, purged: { ...purged, staleSubscribers, expiredTokens } });
  } catch (err) {
    console.error("[cron/emails] failed", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
