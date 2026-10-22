import { createHash } from "crypto";
import { LIMITS, isBot, sanitizeBrowserReport } from "@/lib/error-scrub";
import { recordError, releaseId } from "@/lib/error-log";
import { clientIpFrom } from "@/lib/login-throttle";
import { checkRateLimit } from "@/lib/rate-limit";

// Where a visitor's browser reports a failure (see components/ErrorReporter.tsx). It is PUBLIC (no sign-in), so it is built not to be abused and not to reveal anything: it is size-limited, only accepts a
// request from the site itself, ignores bots, is rate-limited for each visitor and for the whole site, saves only a CLEANED report (lib/error-scrub.ts), and ALWAYS answers the same empty 204 whatever
// happened, so it cannot be used to find out anything (not even whether a report was kept).
export const dynamic = "force-dynamic";
const HOUR = 60 * 60 * 1000, DAY = 24 * HOUR;
const done = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  try {
    if (Number(req.headers.get("content-length") ?? 0) > LIMITS.payload) return done();
    const origin = req.headers.get("origin");
    if (origin) { // only the site's own pages may report (a report from any other website is dropped)
      let host = ""; try { host = new URL(origin).host; } catch { return done(); }
      const mine = [req.headers.get("x-forwarded-host"), req.headers.get("host"), (() => { try { return new URL(process.env.NEXT_PUBLIC_APP_URL || "").host; } catch { return ""; } })()].filter(Boolean);
      if (!mine.includes(host)) return done();
    }
    const ua = req.headers.get("user-agent") ?? "";
    if (!ua || isBot(ua)) return done();
    const visitor = createHash("sha256").update(`errors|${clientIpFrom(Object.fromEntries(req.headers))}`).digest("hex").slice(0, 24); // never stored with the report: only used to count
    if (!(await checkRateLimit(`errors:v:${visitor}`, 20, HOUR))) return done();
    if (!(await checkRateLimit("errors:all", 3000, DAY))) return done();
    const text = await req.text(); if (text.length > LIMITS.payload) return done();
    let body: unknown; try { body = JSON.parse(text); } catch { return done(); }
    const report = sanitizeBrowserReport(body, { userAgent: ua, signedIn: /(?:^|;\s*)(?:__Secure-)?next-auth\.session-token=/.test(req.headers.get("cookie") ?? ""), release: releaseId() });
    if (report) await recordError(report);
  } catch { /* nothing here is ever reported back */ }
  return done();
}
