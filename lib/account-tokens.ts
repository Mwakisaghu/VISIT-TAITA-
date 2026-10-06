import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export type TokenPurpose = "VERIFY_EMAIL" | "RESET_PASSWORD";

/** A verification link lives for days (people read email late); a password-reset link is short-lived on purpose. */
export const TOKEN_TTL_MS: Record<TokenPurpose, number> = {
  VERIFY_EMAIL: 3 * 24 * 60 * 60 * 1000,
  RESET_PASSWORD: 60 * 60 * 1000,
};

/** An invitation to choose a first password lives for a week (a new colleague may not read their email for days). */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Works with the normal client or a transaction client.
type Db = Pick<typeof prisma, "accountToken">;

/** 192 random bits, URL-safe. This is what goes in the emailed link and is never stored. */
export function newRawToken(): string {
  return randomBytes(24).toString("base64url");
}

/** What IS stored. A copy of the database can't be turned back into a working link. */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Creates a fresh link for this person and purpose, and cancels any earlier one that hasn't been used — so only the
 * newest email's link ever works. Returns the raw secret (for the email); only its hash is saved.
 */
export async function issueToken(db: Db, userId: string, purpose: TokenPurpose, now: Date = new Date(), ttlMs: number = TOKEN_TTL_MS[purpose]): Promise<string> {
  const raw = newRawToken();
  await db.accountToken.deleteMany({ where: { userId, purpose, usedAt: null } });
  await db.accountToken.create({
    data: { userId, purpose, tokenHash: hashToken(raw), expiresAt: new Date(now.getTime() + ttlMs) },
  });
  return raw;
}

/** The token row if this secret is real, for this purpose, unused and unexpired — otherwise null. Reads only. */
export async function findUsableToken(db: Db, raw: string, purpose: TokenPurpose, now: Date = new Date()) {
  const secret = String(raw ?? "");
  if (secret.length < 16 || secret.length > 64) return null;
  return db.accountToken.findFirst({
    where: { tokenHash: hashToken(secret), purpose, usedAt: null, expiresAt: { gt: now } },
    select: { id: true, userId: true },
  });
}

/** Marks a token used. True only for the ONE caller that actually used it, so a link can never be used twice (even by a race). */
export async function consumeToken(db: Db, id: string, now: Date = new Date()): Promise<boolean> {
  const res = await db.accountToken.updateMany({ where: { id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
  return res.count === 1;
}

/** Deletes tokens that expired more than a day ago. Called from the cron endpoint. */
export async function purgeExpiredTokens(now: Date = new Date()): Promise<number> {
  const res = await prisma.accountToken.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } });
  return res.count;
}
