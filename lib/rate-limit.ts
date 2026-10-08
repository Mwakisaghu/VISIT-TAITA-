/**
 * Rate limiter that holds across EVERY running copy of the site: the counters live in the database (see lib/rate-limit-store.ts), so on
 * serverless or multi-server hosting a limit of 10 means 10 in total, not 10 per copy.
 *
 *   if (!(await checkRateLimit(`contact:${ip}`, 5, 60 * 60 * 1000))) return tooMany;
 *
 * Always `await` it: a forgotten await would silently let everything through. (The repository check refuses unawaited calls.)
 *
 * HOW IT BEHAVES
 *  - Fixed windows: the window starts at the first hit and ends `windowMs` later, then the count starts again. (The old in-memory limiter used a
 *    sliding window; a fixed one can allow up to twice the limit across a window boundary — fine for slowing abuse, not for billing.)
 *  - Once a key is over the limit, THIS copy remembers that until the window ends, so a flood of refused requests costs no database work.
 *  - If the database can't be reached, this copy counts for itself (the old behaviour) and says so once in the log. Visitors are not
 *    locked out and protection does not vanish; it just stops being shared until the database is back.
 */
import { prismaStore, type RateStore } from "@/lib/rate-limit-store";

const MAX_TRACKED = 5000;

export function createLimiter(getStore: () => RateStore) {
  const local = new Map<string, number[]>(); // the fallback: this copy's own sliding window
  const blocked = new Map<string, number>(); // keys this copy already knows are over the limit, until when (epoch ms)
  let warned = false;
  const warn = (e: unknown) => { if (!warned) { warned = true; console.warn("[rate-limit] shared counters unavailable; counting per server for now:", (e as Error)?.message ?? e); } };

  function localAllow(key: string, limit: number, windowMs: number, now: number): boolean {
    const recent = (local.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) { local.set(key, recent); return false; }
    recent.push(now); local.set(key, recent);
    if (local.size > MAX_TRACKED) for (const [k, times] of local) if (times.every((t) => now - t >= windowMs)) local.delete(k);
    return true;
  }

  async function check(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const until = blocked.get(key);
    if (until !== undefined) { if (until > now) return false; blocked.delete(key); }
    try {
      const h = await getStore().hit(key, windowMs);
      if (h.count > limit) {
        blocked.set(key, now + Math.max(0, h.retryMs));
        if (blocked.size > MAX_TRACKED) for (const [k, u] of blocked) if (u <= now) blocked.delete(k);
        return false;
      }
      return true;
    } catch (e) {
      warn(e);
      return localAllow(key, limit, windowMs, now);
    }
  }

  return { check, reset() { local.clear(); blocked.clear(); warned = false; }, size: () => ({ local: local.size, blocked: blocked.size }) };
}

let override: RateStore | null = null;
/** For tests: use another store (or null to go back to the database). */
export function setRateLimitStore(s: RateStore | null) { override = s; }
export const currentStore = (): RateStore => override ?? prismaStore;

const shared = createLimiter(currentStore);
export const checkRateLimit = shared.check;
export const resetRateLimitsForTests = shared.reset;

/** Deletes counters that ended more than a day ago. Run by the scheduled job; never throws. */
export async function purgeExpiredRateLimits(): Promise<number> {
  try { return await currentStore().purge(); } catch (e) { console.error("[rate-limit] purge failed:", (e as Error).message); return 0; }
}
