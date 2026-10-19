// "Remember this browser for 30 days" (MEMBERS ONLY, never staff or money-handling roles): a random value in a cookie called taita-trusted-browser lets that browser skip the second step. Only a fingerprint of the
// value is stored. It is a trade: anyone holding that browser AND the password could sign in, so it is optional, limited to 30 days, and ended by turning two-step off, changing the password, signing out
// everywhere, a reset, or the person choosing "Forget my browsers".
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const TRUST_COOKIE = "taita-trusted-browser";
export const TRUST_DAYS = 30;
export const TRUST_MS = TRUST_DAYS * 24 * 60 * 60 * 1000;
export interface TrustedDb {
  trustedDevice: {
    create(a: { data: { userId: string; tokenHash: string; expiresAt: Date } }): Promise<unknown>;
    findFirst(a: { where: Record<string, unknown> }): Promise<{ id: string } | null>;
    updateMany(a: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
    deleteMany(a: { where: Record<string, unknown> }): Promise<{ count: number }>;
    count(a: { where: Record<string, unknown> }): Promise<number>;
  };
}
export const liveTrustedDb = (): TrustedDb => prisma as unknown as TrustedDb;
export const hashDeviceToken = (token: string): string => createHash("sha256").update(token).digest("hex");
export const newDeviceToken = (): string => randomBytes(32).toString("base64url");

/** One cookie's value from a Cookie header, or null. Length-limited, and a malformed header never throws. */
export function readCookie(header: unknown, name: string): string | null {
  if (typeof header !== "string" || header.length > 8192) return null;
  for (const part of header.split(";")) { const i = part.indexOf("="); if (i > 0 && part.slice(0, i).trim() === name) { try { return decodeURIComponent(part.slice(i + 1).trim()).slice(0, 200) || null; } catch { return null; } } }
  return null;
}

/** Remembers a new browser; returns the value to put in the cookie. Old, expired ones of this person are cleared. */
export async function rememberBrowser(userId: string, { db = liveTrustedDb(), now = Date.now() }: { db?: TrustedDb; now?: number } = {}): Promise<{ token: string; expiresAt: Date }> {
  const token = newDeviceToken(); const expiresAt = new Date(now + TRUST_MS);
  await db.trustedDevice.deleteMany({ where: { userId, expiresAt: { lt: new Date(now) } } });
  await db.trustedDevice.create({ data: { userId, tokenHash: hashDeviceToken(token), expiresAt } });
  return { token, expiresAt };
}
/** Is this browser one the person remembered, still within 30 days, and remembered AFTER the last password change or sign-out-everywhere (those end every remembered browser)? */
export async function isTrustedBrowser(userId: string, cookieHeader: unknown, { db = liveTrustedDb(), now = Date.now(), notBefore = null }: { db?: TrustedDb; now?: number; notBefore?: Date | null } = {}): Promise<boolean> {
  const token = readCookie(cookieHeader, TRUST_COOKIE); if (!token) return false;
  const row = await db.trustedDevice.findFirst({ where: { userId, tokenHash: hashDeviceToken(token), expiresAt: { gt: new Date(now) }, ...(notBefore ? { createdAt: { gt: notBefore } } : {}) } });
  if (!row) return false;
  void db.trustedDevice.updateMany({ where: { id: row.id }, data: { lastUsedAt: new Date(now) } }).catch(() => null); // best effort
  return true;
}
export const forgetBrowsers = (userId: string, db: TrustedDb = liveTrustedDb()) => db.trustedDevice.deleteMany({ where: { userId } });
export const countBrowsers = (userId: string, now: number = Date.now(), db: TrustedDb = liveTrustedDb()) => db.trustedDevice.count({ where: { userId, expiresAt: { gt: new Date(now) } } });
