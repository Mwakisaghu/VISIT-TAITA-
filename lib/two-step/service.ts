// Two-step sign-in: setting it up, checking a code at sign-in, recovery codes and turning it off. All database access goes through a small interface (TwoStepDb), so tests use an in-memory copy.
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { decryptSecret, encryptSecret, loadKey } from "@/lib/two-step/crypto";
import { sendEmailCode, verifyEmailCode, type EmailCodeDb } from "@/lib/two-step/email-code";
import { makeRecoveryCodes, cleanRecovery, recoveryHash } from "@/lib/two-step/recovery";
import { cleanCode, newSecret, otpauthUri, verifyTotp } from "@/lib/two-step/totp";

export type TwoStepRow = { id?: string; userId: string; secretEnc: string; enabledAt: Date | null; lastStep: number | null; method?: string };
export type TwoStepMethod = "TOTP" | "EMAIL";
export interface TwoStepDb {
  twoFactor: {
    findUnique(a: { where: { userId: string } }): Promise<TwoStepRow | null>;
    upsert(a: { where: { userId: string }; create: { userId: string; secretEnc: string; method: TwoStepMethod }; update: { secretEnc: string; method: TwoStepMethod; enabledAt: null; lastStep: null } }): Promise<unknown>;
    updateMany(a: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
    deleteMany(a: { where: { userId: string } }): Promise<{ count: number }>;
  };
  recoveryCode: {
    createMany(a: { data: { userId: string; codeHash: string }[] }): Promise<{ count: number }>;
    updateMany(a: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
    deleteMany(a: { where: { userId: string } }): Promise<{ count: number }>;
    count(a: { where: Record<string, unknown> }): Promise<number>;
  };
  // Present on the real database; ending two-step also ends these (a test database may leave them out).
  emailCode?: { deleteMany(a: { where: { userId: string } }): Promise<unknown> };
  trustedDevice?: { deleteMany(a: { where: { userId: string } }): Promise<unknown> };
}
// The new tables are reached through this interface rather than the generated client's own types, so the code does not depend on the client having been regenerated first.
export const liveDb = (): TwoStepDb => prisma as unknown as TwoStepDb;
type Deps = { db?: TwoStepDb; key?: Buffer | null; now?: number };
const MIN15 = 15 * 60 * 1000;
export const ISSUER = "Visit Taita";

export async function twoStepEnabled(userId: string, db: TwoStepDb = liveDb()): Promise<boolean> { const r = await db.twoFactor.findUnique({ where: { userId } }); return !!r?.enabledAt; }
/** How this person has two-step set up, or null if it is not on. */
export async function twoStepMethodOf(userId: string, db: TwoStepDb = liveDb()): Promise<TwoStepMethod | null> { const r = await db.twoFactor.findUnique({ where: { userId } }); return r?.enabledAt ? (r.method === "EMAIL" ? "EMAIL" : "TOTP") : null; }
export async function twoStepStatus(userId: string, db: TwoStepDb = liveDb()): Promise<{ enabled: boolean; recoveryLeft: number; method: TwoStepMethod | null }> {
  const method = await twoStepMethodOf(userId, db); const enabled = method !== null; return { enabled, method, recoveryLeft: enabled ? await db.recoveryCode.count({ where: { userId, usedAt: null } }) : 0 };
}

/** Step 1 of setup: a new secret (kept encrypted, not yet in force) and the address for the QR code. Starting again replaces an unfinished one. */
export async function beginSetup(userId: string, account: string, { db = liveDb(), key = loadKey(), replaceEmail = false }: Deps & { replaceEmail?: boolean } = {}): Promise<{ ok: true; secret: string; uri: string } | { ok: false; code: "unavailable" | "already_on" | "too_many" }> {
  if (!key) return { ok: false, code: "unavailable" };
  if (!(await checkRateLimit(`2fa-begin:${userId}`, 10, MIN15))) return { ok: false, code: "too_many" };
  const current = await twoStepMethodOf(userId, db);
  if (current && !(replaceEmail && current === "EMAIL")) return { ok: false, code: "already_on" }; // an emailed-code setup may be replaced by the app only when the role now requires the app
  const secret = newSecret(); const secretEnc = encryptSecret(secret, key);
  await db.twoFactor.upsert({ where: { userId }, create: { userId, secretEnc, method: "TOTP" }, update: { secretEnc, method: "TOTP", enabledAt: null, lastStep: null } });
  return { ok: true, secret, uri: otpauthUri({ issuer: ISSUER, account, secret }) };
}

async function storeCodes(userId: string, key: Buffer, db: TwoStepDb): Promise<string[]> {
  const codes = makeRecoveryCodes();
  await db.recoveryCode.deleteMany({ where: { userId } });
  await db.recoveryCode.createMany({ data: codes.map((c) => ({ userId, codeHash: recoveryHash(cleanRecovery(c)!, key) })) });
  return codes;
}
/** Step 2 of setup: the person types a code from their app. If it is right, two-step is on, and the recovery codes are made (returned ONCE; only fingerprints are kept). */
export async function confirmSetup(userId: string, input: unknown, { db = liveDb(), key = loadKey(), now = Date.now() }: Deps = {}): Promise<{ ok: true; codes: string[] } | { ok: false; code: "unavailable" | "not_started" | "already_on" | "wrong_code" | "too_many" }> {
  if (!key) return { ok: false, code: "unavailable" };
  if (!(await checkRateLimit(`2fa-setup:${userId}`, 10, MIN15))) return { ok: false, code: "too_many" };
  const row = await db.twoFactor.findUnique({ where: { userId } });
  if (!row) return { ok: false, code: "not_started" }; if (row.enabledAt) return { ok: false, code: "already_on" };
  if ((row.method ?? "TOTP") !== "TOTP") return { ok: false, code: "not_started" }; // a pending emailed-code setup is confirmed with its own code
  const secret = decryptSecret(row.secretEnc, key); if (!secret) return { ok: false, code: "not_started" };
  const step = verifyTotp(secret, input, { now }); if (step === null) return { ok: false, code: "wrong_code" };
  const claimed = await db.twoFactor.updateMany({ where: { userId, enabledAt: null }, data: { enabledAt: new Date(now), lastStep: step } });
  if (claimed.count !== 1) return { ok: false, code: "already_on" }; // a second request got there first
  return { ok: true, codes: await storeCodes(userId, key, db) };
}

/** Email method, step 1 (members only: the caller checks the role and a verified address). Makes a pending record and emails a code to the person's own address. */
export async function beginEmailSetup(user: { id: string; name: string; email: string }, { db = liveDb(), key = loadKey(), now = Date.now(), mail, ip }: Deps & { mail?: (m: { to: string; subject: string; text: string }) => Promise<unknown>; ip?: string } = {}): Promise<{ ok: true } | { ok: false; code: "unavailable" | "already_on" | "too_many" }> {
  if (!key) return { ok: false, code: "unavailable" };
  if (await twoStepEnabled(user.id, db)) return { ok: false, code: "already_on" };
  // The record keeps the same shape as an app setup, so the rest of the code needs no special case; the secret in it is never used for the email method.
  await db.twoFactor.upsert({ where: { userId: user.id }, create: { userId: user.id, secretEnc: encryptSecret(newSecret(), key), method: "EMAIL" }, update: { secretEnc: encryptSecret(newSecret(), key), method: "EMAIL", enabledAt: null, lastStep: null } });
  const sent = await sendEmailCode(user, { db: db as unknown as EmailCodeDb, key, now, mail, ip });
  return sent.ok ? { ok: true } : { ok: false, code: sent.reason === "rate_limited" ? "too_many" : "unavailable" };
}
/** Email method, step 2: the emailed code proves the person can read that address; then it is on, and ten recovery codes are made (returned once). */
export async function confirmEmailSetup(userId: string, input: unknown, { db = liveDb(), key = loadKey(), now = Date.now() }: Deps = {}): Promise<{ ok: true; codes: string[] } | { ok: false; code: "unavailable" | "not_started" | "already_on" | "wrong_code" | "too_many" }> {
  if (!key) return { ok: false, code: "unavailable" };
  if (!(await checkRateLimit(`2fa-setup:${userId}`, 10, MIN15))) return { ok: false, code: "too_many" };
  const row = await db.twoFactor.findUnique({ where: { userId } });
  if (!row || row.method !== "EMAIL") return { ok: false, code: "not_started" }; if (row.enabledAt) return { ok: false, code: "already_on" };
  if (!(await verifyEmailCode(userId, input, { db: db as unknown as EmailCodeDb, key, now }))) return { ok: false, code: "wrong_code" };
  const claimed = await db.twoFactor.updateMany({ where: { userId, enabledAt: null }, data: { enabledAt: new Date(now) } });
  if (claimed.count !== 1) return { ok: false, code: "already_on" };
  return { ok: true, codes: await storeCodes(userId, key, db) };
}

export type LoginCheck = { ok: true; via: "totp" | "email" | "recovery" } | { ok: false; reason: "rate_limited" | "unavailable" | "wrong" };
/**
 * The second step of signing in. A code is accepted ONCE: the step it belongs to is remembered (atomically, so two simultaneous requests cannot both use it), and a recovery code is marked used the same way.
 * Attempts are limited per account (so guessing six digits is hopeless) and per connection.
 */
export async function verifyLoginCode(userId: string, input: unknown, { ip = "unknown", db = liveDb(), key = loadKey(), now = Date.now() }: Deps & { ip?: string } = {}): Promise<LoginCheck> {
  if (!(await checkRateLimit(`2fa:${userId}`, 8, MIN15)) || !(await checkRateLimit(`2fa-ip:${ip}`, 40, MIN15))) return { ok: false, reason: "rate_limited" };
  const row = await db.twoFactor.findUnique({ where: { userId } });
  if (!row?.enabledAt) return { ok: false, reason: "wrong" };
  if (!key) return { ok: false, reason: "unavailable" };
  const secret = decryptSecret(row.secretEnc, key); if (!secret) return { ok: false, reason: "unavailable" };
  if (cleanCode(input)) {
    // Six digits mean the emailed code for someone on the email method, and the app's code for everyone else: never the other way round.
    if (row.method === "EMAIL") return (await verifyEmailCode(userId, input, { db: db as unknown as EmailCodeDb, key, now })) ? { ok: true, via: "email" } : { ok: false, reason: "wrong" };
    const step = verifyTotp(secret, input, { now, afterStep: row.lastStep }); if (step === null) return { ok: false, reason: "wrong" };
    const took = await db.twoFactor.updateMany({ where: { userId, enabledAt: { not: null }, OR: [{ lastStep: null }, { lastStep: { lt: step } }] }, data: { lastStep: step } });
    return took.count === 1 ? { ok: true, via: "totp" } : { ok: false, reason: "wrong" };
  }
  const rec = cleanRecovery(input); if (!rec) return { ok: false, reason: "wrong" };
  const used = await db.recoveryCode.updateMany({ where: { userId, codeHash: recoveryHash(rec, key), usedAt: null }, data: { usedAt: new Date(now) } });
  return used.count === 1 ? { ok: true, via: "recovery" } : { ok: false, reason: "wrong" };
}

/** Ten new recovery codes; the old ones stop working. */
export async function newRecoveryCodes(userId: string, { db = liveDb(), key = loadKey() }: Deps = {}): Promise<string[] | null> { return key ? storeCodes(userId, key, db) : null; }
/** Turns two-step off and forgets the secret and every recovery code. */
export async function turnOff(userId: string, db: TwoStepDb = liveDb()): Promise<void> {
  await db.recoveryCode.deleteMany({ where: { userId } }); await db.twoFactor.deleteMany({ where: { userId } });
  await db.emailCode?.deleteMany({ where: { userId } }); await db.trustedDevice?.deleteMany({ where: { userId } }); // no pending code and no remembered browser outlives it
}
