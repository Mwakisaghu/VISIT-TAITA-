// The email method of two-step sign-in (MEMBERS ONLY): a 6-digit code emailed to the person's own address, instead of one from an authenticator app. It is weaker, and the product says so: anyone who controls the
// person's inbox can read the code (and could also reset the password from it). It still stops the commonest attack, a stolen or reused password on its own.
//  * a code lives 10 minutes, works once, allows 5 tries, and only a keyed fingerprint is stored;
//  * asking for a new code is limited (3 in 15 minutes per person), and a new code ends the older ones;
//  * the 5-try limit is enforced by taking an attempt BEFORE comparing (atomically), so simultaneous guesses cannot exceed it.
import { randomInt, timingSafeEqual } from "node:crypto";
import { twoStepEmailCodeText } from "@/lib/account-emails";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { keyedHash, loadKey } from "@/lib/two-step/crypto";
import { cleanCode } from "@/lib/two-step/totp";

export const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
export const EMAIL_CODE_MAX_ATTEMPTS = 5;
export interface EmailCodeDb {
  emailCode: {
    create(a: { data: { userId: string; codeHash: string; expiresAt: Date } }): Promise<unknown>;
    findFirst(a: { where: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc"> }): Promise<{ id: string; codeHash: string; attempts: number } | null>;
    updateMany(a: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
    deleteMany(a: { where: { userId: string } }): Promise<{ count: number }>;
  };
}
export const liveEmailDb = (): EmailCodeDb => prisma as unknown as EmailCodeDb;
type Mail = (m: { to: string; subject: string; text: string }) => Promise<unknown>;
type Deps = { db?: EmailCodeDb; key?: Buffer | null; now?: number };
const fingerprint = (code: string, key: Buffer): string => keyedHash("email-code", code, key);
export const makeEmailCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, "0");

/** Emails a new code (ending any older ones). Never throws. */
export async function sendEmailCode(user: { id: string; name: string; email: string }, { db = liveEmailDb(), key = loadKey(), now = Date.now(), mail, ip = "unknown" }: Deps & { mail?: Mail; ip?: string } = {}): Promise<{ ok: true } | { ok: false; reason: "rate_limited" | "unavailable" }> {
  if (!key) return { ok: false, reason: "unavailable" };
  if (!(await checkRateLimit(`2fa-email-send:${user.id}`, 3, 15 * 60 * 1000)) || !(await checkRateLimit(`2fa-email-send-ip:${ip}`, 20, 15 * 60 * 1000))) return { ok: false, reason: "rate_limited" };
  const code = makeEmailCode();
  await db.emailCode.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date(now) } }); // only the newest code works
  await db.emailCode.create({ data: { userId: user.id, codeHash: fingerprint(code, key), expiresAt: new Date(now + EMAIL_CODE_TTL_MS) } });
  try { await mail?.({ to: user.email, subject: "Your Visit Taita code", text: twoStepEmailCodeText(user.name, code, EMAIL_CODE_TTL_MS / 60000) }); } catch { /* a mail outage means no code arrives; the person can ask again */ }
  return { ok: true };
}

/** Is this the right, unexpired, unused code for the person? A right code is used up by being accepted. */
export async function verifyEmailCode(userId: string, input: unknown, { db = liveEmailDb(), key = loadKey(), now = Date.now() }: Deps = {}): Promise<boolean> {
  const clean = cleanCode(input); if (!clean || !key) return false;
  const row = await db.emailCode.findFirst({ where: { userId, usedAt: null, expiresAt: { gt: new Date(now) } }, orderBy: { createdAt: "desc" } });
  if (!row) return false;
  const took = await db.emailCode.updateMany({ where: { id: row.id, usedAt: null, attempts: { lt: EMAIL_CODE_MAX_ATTEMPTS } }, data: { attempts: { increment: 1 } } }); // an attempt is TAKEN first
  if (took.count !== 1) return false;
  const a = Buffer.from(fingerprint(clean, key)), b = Buffer.from(row.codeHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const used = await db.emailCode.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date(now) } });
  return used.count === 1;
}
