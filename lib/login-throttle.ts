// Slows down password guessing. Counts FAILED sign-ins per (email, address) pair and per address, for a window; once over
// the limit, sign-in is refused until the window passes — even with the right password, because a guesser would otherwise
// find out when they got it right.
//
// SHARED: the counts live in the database (see lib/rate-limit-store.ts), so the limit holds across every running copy of the site. If the
// database can't be reached, each copy falls back to counting for itself (and says so once in the log), so sign-in keeps working.
// It doesn't cover one email being guessed from many different addresses at once; the password-hashing cost is the defence there.

import { currentStore } from "@/lib/rate-limit";
import type { RateStore } from "@/lib/rate-limit-store";

export const LOGIN_LIMITS = { windowMs: 15 * 60 * 1000, perPair: 8, perIp: 40 } as const;

type Entry = { count: number; resetAt: number };
const pairs = new Map<string, Entry>();
const addresses = new Map<string, Entry>();

function live(map: Map<string, Entry>, key: string, now: number): Entry | null {
  const e = map.get(key);
  if (!e) return null;
  if (e.resetAt <= now) {
    map.delete(key);
    return null;
  }
  return e;
}

function bump(map: Map<string, Entry>, key: string, now: number) {
  const e = live(map, key, now);
  if (e) e.count += 1;
  else map.set(key, { count: 1, resetAt: now + LOGIN_LIMITS.windowMs });
}

const pairKey = (email: string, ip: string) => `login:pair:${email.toLowerCase()}|${ip}`;
const ipKey = (ip: string) => `login:ip:${ip}`;

export function createLoginThrottle(getStore: () => RateStore) {
  let warned = false;
  const warn = (e: unknown) => { if (!warned) { warned = true; console.warn("[login-throttle] shared counters unavailable; counting per server for now:", (e as Error)?.message ?? e); } };
  const memPair = (email: string, ip: string) => `${email.toLowerCase()}|${ip}`;

  return {
    /** Is this person (or this address) blocked right now? Checked BEFORE the password, so a guesser can't tell when they got it right. */
    async isBlocked(email: string, ip: string, now: number = Date.now()): Promise<boolean> {
      try {
        const k1 = pairKey(email, ip), k2 = ipKey(ip); const c = await getStore().peek([k1, k2]);
        return (c[k1] ?? 0) >= LOGIN_LIMITS.perPair || (c[k2] ?? 0) >= LOGIN_LIMITS.perIp;
      } catch (e) {
        warn(e);
        return (live(pairs, memPair(email, ip), now)?.count ?? 0) >= LOGIN_LIMITS.perPair || (live(addresses, ip, now)?.count ?? 0) >= LOGIN_LIMITS.perIp;
      }
    },
    async recordFailure(email: string, ip: string, now: number = Date.now()): Promise<void> {
      bump(pairs, memPair(email, ip), now); bump(addresses, ip, now); // this copy's own count too, so the fallback has something to go on
      if (pairs.size > 5000) for (const [k, e] of pairs) if (e.resetAt <= now) pairs.delete(k);
      if (addresses.size > 5000) for (const [k, e] of addresses) if (e.resetAt <= now) addresses.delete(k);
      try { const s = getStore(); await s.hit(pairKey(email, ip), LOGIN_LIMITS.windowMs); await s.hit(ipKey(ip), LOGIN_LIMITS.windowMs); } catch (e) { warn(e); }
    },
    /** A successful sign-in clears that person's count — but NOT the address-wide count, so a guesser can't reset it with a login of their own. */
    async clearFailures(email: string, ip: string): Promise<void> {
      pairs.delete(memPair(email, ip));
      try { await getStore().clear(pairKey(email, ip)); } catch (e) { warn(e); }
    },
    resetMemory() { pairs.clear(); addresses.clear(); warned = false; },
  };
}

const shared = createLoginThrottle(currentStore);
export const isLoginBlocked = shared.isBlocked;
export const recordLoginFailure = shared.recordFailure;
export const clearLoginFailures = shared.clearFailures;
export const resetLoginThrottle = shared.resetMemory;

/** The first address in X-Forwarded-For, or "unknown". */
export function clientIpFrom(headers: Record<string, unknown> | undefined): string {
  const raw = headers?.["x-forwarded-for"] ?? headers?.["x-real-ip"];
  const value = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
  return value.split(",")[0].trim() || "unknown";
}
