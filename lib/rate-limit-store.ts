// The shared home of the rate-limit counters: one row per limited thing, in the database every running copy of the site already uses.
// Each check is ONE atomic statement (insert, or add one to the existing row), so two copies counting at the same instant can't lose a hit.
// The key is hashed before it is stored: no email address or IP address is ever written to this table.
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export type Hit = { count: number; retryMs: number };
export interface RateStore {
  /** Adds one hit to `key` (starting a new window if the old one ended) and returns how many hits the current window has, and how long until it ends. */
  hit(key: string, windowMs: number): Promise<Hit>;
  /** How many hits each of these keys has in its current window (0 for a key with none). */
  peek(keys: string[]): Promise<Record<string, number>>;
  clear(key: string): Promise<void>;
  /** Deletes buckets that ended more than a day ago. Returns how many. */
  purge(): Promise<number>;
}

// The database's own clock decides when a window ends (not each server's), so servers with slightly different clocks still agree.
const NOW_UTC = `(NOW() AT TIME ZONE 'UTC')`;
export const HIT_SQL = `INSERT INTO "RateLimitBucket" ("key", "count", "resetsAt")
VALUES ($1, 1, ${NOW_UTC} + ($2::double precision * INTERVAL '1 millisecond'))
ON CONFLICT ("key") DO UPDATE SET
  "count" = CASE WHEN "RateLimitBucket"."resetsAt" <= ${NOW_UTC} THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
  "resetsAt" = CASE WHEN "RateLimitBucket"."resetsAt" <= ${NOW_UTC} THEN ${NOW_UTC} + ($2::double precision * INTERVAL '1 millisecond') ELSE "RateLimitBucket"."resetsAt" END
RETURNING "count", (EXTRACT(EPOCH FROM ("resetsAt" - ${NOW_UTC})) * 1000)::double precision AS "retryMs"`;
export const peekSql = (n: number) => `SELECT "key", "count" FROM "RateLimitBucket" WHERE "key" IN (${Array.from({ length: n }, (_, i) => `$${i + 1}`).join(", ")}) AND "resetsAt" > ${NOW_UTC}`;
export const CLEAR_SQL = `DELETE FROM "RateLimitBucket" WHERE "key" = $1`;
export const PURGE_SQL = `DELETE FROM "RateLimitBucket" WHERE "resetsAt" < ${NOW_UTC} - INTERVAL '1 day'`;

/** 192 bits of SHA-256, URL-safe: the same input always gives the same key, and the input can't be read back from it. */
export const hashKey = (key: string): string => createHash("sha256").update(key).digest("base64url").slice(0, 32);

export const prismaStore: RateStore = {
  async hit(key, windowMs) {
    const rows = (await prisma.$queryRawUnsafe(HIT_SQL, hashKey(key), Math.max(1, Math.round(windowMs)))) as Array<{ count: number | bigint; retryMs: number }>;
    return { count: Number(rows[0].count), retryMs: Number(rows[0].retryMs) };
  },
  async peek(keys) {
    const out: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
    if (keys.length === 0) return out;
    const byHash = new Map(keys.map((k) => [hashKey(k), k]));
    const rows = (await prisma.$queryRawUnsafe(peekSql(keys.length), ...byHash.keys())) as Array<{ key: string; count: number | bigint }>;
    for (const r of rows) { const k = byHash.get(r.key); if (k !== undefined) out[k] = Number(r.count); }
    return out;
  },
  async clear(key) { await prisma.$executeRawUnsafe(CLEAR_SQL, hashKey(key)); },
  async purge() { return Number(await prisma.$executeRawUnsafe(PURGE_SQL)); },
};
