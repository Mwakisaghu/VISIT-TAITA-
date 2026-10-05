// Slows down password guessing. Counts FAILED sign-ins per (email, address) pair and per address, for a window; once over
// the limit, sign-in is refused until the window passes — even with the right password, because a guesser would otherwise
// find out when they got it right.
//
// LIMITS TO KNOW ABOUT: this is held in memory, so on a serverless host each running copy counts separately — it makes
// guessing much slower but is not a hard guarantee. A shared store (Redis/Upstash) would make it exact. It also doesn't
// cover one email being guessed from many different addresses at once; the password-hashing cost is the defence there.

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

const pairKey = (email: string, ip: string) => `${email.toLowerCase()}|${ip}`;

export function isLoginBlocked(email: string, ip: string, now: number = Date.now()): boolean {
  return (live(pairs, pairKey(email, ip), now)?.count ?? 0) >= LOGIN_LIMITS.perPair || (live(addresses, ip, now)?.count ?? 0) >= LOGIN_LIMITS.perIp;
}

export function recordLoginFailure(email: string, ip: string, now: number = Date.now()): void {
  bump(pairs, pairKey(email, ip), now);
  bump(addresses, ip, now);
  if (pairs.size > 5000) for (const [k, e] of pairs) if (e.resetAt <= now) pairs.delete(k); // keep memory bounded
  if (addresses.size > 5000) for (const [k, e] of addresses) if (e.resetAt <= now) addresses.delete(k);
}

/** A successful sign-in clears that person's count — but NOT the address-wide count, so a guesser can't reset it with a login of their own. */
export function clearLoginFailures(email: string, ip: string): void {
  pairs.delete(pairKey(email, ip));
}

export function resetLoginThrottle(): void {
  pairs.clear();
  addresses.clear();
}

/** The first address in X-Forwarded-For, or "unknown". */
export function clientIpFrom(headers: Record<string, unknown> | undefined): string {
  const raw = headers?.["x-forwarded-for"] ?? headers?.["x-real-ip"];
  const value = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
  return value.split(",")[0].trim() || "unknown";
}
