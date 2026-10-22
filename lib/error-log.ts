// The error log's database side: record an error (grouped into an issue), tidy old ones, and turn a SERVER failure into a clean report. Every function here is built to be SAFE to call from the middle of
// a failure: none of them ever throws, and if the database is down they simply do nothing (the site's own failure is never made worse by the attempt to report it).
import { prisma } from "@/lib/prisma";
import { EVENT_DAYS, ISSUE_DAYS, fingerprint, isBot, isNoise, LIMITS, parseBrowser, scrubPath, scrubText, type CleanReport } from "@/lib/error-scrub";

/** How many occurrences are kept for ONE issue (the newest; the oldest is dropped to make room). The count on the issue keeps counting past this. */
export const EVENT_CAP = 100;
const REPEAT_MS = 5000; const recent = new Map<string, number>(); // the same failure a few times in a few seconds (a storm) is recorded once

type Db = Pick<typeof prisma, "errorIssue" | "errorEvent">;
const isUnique = (e: unknown) => (e as { code?: string })?.code === "P2002";
/** What to say when saving a report fails: only the error's code or its type, never its message (a database message can echo the values it was given, and a report is exactly what we must not repeat). */
const why = (e: unknown): string => { const x = e as { code?: unknown; name?: unknown } | null; return typeof x?.code === "string" ? x.code : typeof x?.name === "string" ? x.name : "unknown"; };
const DAY = 24 * 60 * 60 * 1000;

/** The version of the site that was running (the host sets these), so an error can be tied to a deploy. */
export const releaseId = (): string | null => ((process.env.COMMIT_REF || process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || null);

/**
 * Keeps one report. The same failure (same fingerprint) is ONE issue with a count; a failure marked resolved that happens again re-opens as a regression; one marked ignored is counted but its occurrences
 * are not kept. Returns whether anything was kept. NEVER throws.
 */
export async function recordError(c: CleanReport, db: Db = prisma, now: Date = new Date()): Promise<boolean> {
  try {
    const fp = fingerprint(c.source, c.kind, c.message, c.stack ?? "");
    const last = recent.get(fp); if (last !== undefined && now.getTime() - last < REPEAT_MS) return false;
    if (recent.size > 500) for (const [k, t] of recent) if (now.getTime() - t > 60_000) recent.delete(k);
    recent.set(fp, now.getTime());

    const bump = async (id: string, status: string) => db.errorIssue.update({
      where: { id },
      data: { count: { increment: 1 }, lastSeen: now, route: c.route ?? c.path, ...(c.digest ? { lastDigest: c.digest } : {}), ...(status === "RESOLVED" ? { status: "OPEN", regressions: { increment: 1 }, resolvedAt: null } : {}) },
    });
    let issueId: string; let ignored = false;
    const existing = await db.errorIssue.findUnique({ where: { fingerprint: fp }, select: { id: true, status: true } });
    if (existing) { await bump(existing.id, existing.status); issueId = existing.id; ignored = existing.status === "IGNORED"; }
    else {
      try {
        const made = await db.errorIssue.create({ data: { fingerprint: fp, source: c.source, kind: c.kind, message: c.message, route: c.route ?? c.path, lastDigest: c.digest, firstSeen: now, lastSeen: now }, select: { id: true } });
        issueId = made.id;
      } catch (e) {
        if (!isUnique(e)) throw e; // another request created it a moment ago: count this one on it instead
        const again = await db.errorIssue.findUnique({ where: { fingerprint: fp }, select: { id: true, status: true } }); if (!again) return false;
        await bump(again.id, again.status); issueId = again.id; ignored = again.status === "IGNORED";
      }
    }
    if (ignored) return true; // counted, but an ignored failure's occurrences are not kept
    if ((await db.errorEvent.count({ where: { issueId } })) >= EVENT_CAP) {
      const oldest = await db.errorEvent.findFirst({ where: { issueId }, orderBy: { createdAt: "asc" }, select: { id: true } });
      if (oldest) await db.errorEvent.delete({ where: { id: oldest.id } });
    }
    await db.errorEvent.create({ data: { issueId, createdAt: now, path: c.path, method: c.method, stack: c.stack, extra: c.extra, digest: c.digest, browser: c.browser, signedIn: c.signedIn, release: c.release, locale: c.locale } });
    return true;
  } catch (e) { console.error("[error-log] could not record an error:", why(e)); return false; }
}

/** A route PATTERN such as /tickets/[secret]/pdf (Next gives us this, not a real address): kept as written, only cleaned of odd characters. It holds no secret: the secret part is the bracketed name. */
const routePattern = (p: string): string => String(p).slice(0, 200).replace(/[^\w\-./\[\]().@]/g, "") || "/";

type ReqLike = { path?: string; method?: string; headers?: Record<string, string | string[] | undefined> };
type CtxLike = { routerKind?: string; routePath?: string; routeType?: string; renderSource?: string };
const header = (h: ReqLike["headers"], name: string) => { const v = h?.[name]; return Array.isArray(v) ? v[0] ?? "" : typeof v === "string" ? v : ""; };

/** A failure on OUR server (a page, an API route, a server action) as a clean report; null when it is not worth keeping (a redirect, a not-found, a bot). */
export function serverReport(err: unknown, req: ReqLike = {}, ctx: CtxLike = {}): CleanReport | null {
  const e = err as { name?: unknown; message?: unknown; stack?: unknown; digest?: unknown } | null;
  const message = typeof e?.message === "string" && e.message ? e.message : typeof err === "string" ? err : "Unknown server error";
  const stack = typeof e?.stack === "string" ? e.stack : "";
  if (isNoise(message, stack) || (typeof e?.digest === "string" && /^NEXT_/.test(e.digest))) return null;
  const ua = header(req.headers, "user-agent"); if (isBot(ua)) return null;
  const name = typeof e?.name === "string" && e.name ? e.name : "Error";
  const digest = typeof e?.digest === "string" && /^[\w-]{3,40}$/.test(e.digest) ? e.digest : null;
  return {
    source: "SERVER", kind: scrubText(`${ctx.routeType ?? "request"}: ${name}`, LIMITS.kind), message: scrubText(message.split("\n")[0], LIMITS.message), stack: stack ? scrubText(stack, LIMITS.stack) : null,
    extra: ctx.renderSource ? scrubText(`${ctx.routerKind ?? ""} ${ctx.renderSource}`.trim(), LIMITS.extra) : null, path: scrubPath(req.path), route: ctx.routePath ? routePattern(ctx.routePath) : scrubPath(req.path),
    method: /^[A-Z]{3,7}$/.test(req.method ?? "") ? (req.method as string) : null, digest, browser: parseBrowser(ua),
    signedIn: /(?:^|;\s*)(?:__Secure-)?next-auth\.session-token=/.test(header(req.headers, "cookie")), release: releaseId(), locale: null,
  };
}
/** Called by the server's own error hook (instrumentation.ts). Never throws. */
export async function recordServerError(err: unknown, req?: ReqLike, ctx?: CtxLike): Promise<boolean> {
  try { const r = serverReport(err, req, ctx); return r ? await recordError(r) : false; } catch { return false; }
}

/** Tidies old reports: occurrences older than EVENT_DAYS go, and an issue not seen for ISSUE_DAYS goes with whatever it still holds. Never throws. */
export async function purgeOldErrors(db: Pick<typeof prisma, "errorIssue" | "errorEvent"> = prisma, now: Date = new Date()): Promise<{ events: number; issues: number }> {
  try {
    const events = await db.errorEvent.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - EVENT_DAYS * DAY) } } });
    const issues = await db.errorIssue.deleteMany({ where: { lastSeen: { lt: new Date(now.getTime() - ISSUE_DAYS * DAY) } } });
    return { events: events.count, issues: issues.count };
  } catch (e) { console.error("[error-log] could not tidy old errors:", why(e)); return { events: 0, issues: 0 }; }
}

/** How many open issues have been seen in the last 24 hours (the number on the menu, the bell and the overview). */
export const recentErrorCount = (db: Pick<typeof prisma, "errorIssue"> = prisma, now: Date = new Date()): Promise<number> =>
  db.errorIssue.count({ where: { status: "OPEN", lastSeen: { gte: new Date(now.getTime() - DAY) } } });
