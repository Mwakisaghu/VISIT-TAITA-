import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { normaliseEmail } from "@/lib/user-admin";

type Db = {
  user: { findUnique: (a: any) => Promise<any>; create: (a: any) => Promise<any>; update: (a: any) => Promise<any> };
  adminAuditLog: { create: (a: any) => Promise<any> };
};

// No look-alike characters (0/O, 1/l/I), so it can be read aloud or copied from a screen without mistakes.
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generatePassword(length = 20): string {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export type BootstrapResult =
  | { ok: true; created: true; password: string; email: string }
  | { ok: true; created: false; promoted: boolean; email: string; note: string }
  | { ok: false; error: string };

/**
 * Creates the first super admin from the command line (npm run admin:create), with a RANDOM password that is shown once — never a
 * default one. If the address already has an account it is never touched unless `promote` is set, and then only the role changes
 * (the person's password stays theirs).
 */
export async function createSuperAdmin(db: Db, input: { email: unknown; name: unknown; promote?: boolean }, now = new Date()): Promise<BootstrapResult> {
  const email = normaliseEmail(input.email);
  if (!email) return { ok: false, error: "Give a valid email address with --email." };
  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
  const existing = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (existing) {
    if (existing.role === "SUPER_ADMIN") return { ok: true, created: false, promoted: false, email, note: "That account is already a super admin. Nothing was changed." };
    if (!input.promote) return { ok: false, error: `An account for ${email} already exists (role ${existing.role}). To make it a super admin, run again with --promote. Its password is not changed.` };
    const previousRole = existing.role; // read BEFORE the update, so the record says what it really was
    await db.user.update({ where: { id: existing.id }, data: { role: "SUPER_ADMIN", emailVerifiedAt: now } });
    await db.adminAuditLog.create({ data: { actorEmail: "command line", action: "user.role", targetUserId: existing.id, targetEmail: email, detail: `${previousRole} → SUPER_ADMIN (npm run admin:create --promote)` } });
    return { ok: true, created: false, promoted: true, email, note: "Promoted to super admin. Their password was not changed." };
  }
  if (name.length < 2 || name.length > 80) return { ok: false, error: "Give the person's name with --name \"Full Name\" (2–80 characters)." };
  const password = generatePassword();
  const created = await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10), role: "SUPER_ADMIN", emailVerifiedAt: now }, select: { id: true } });
  await db.adminAuditLog.create({ data: { actorEmail: "command line", action: "user.invite", targetUserId: created.id, targetEmail: email, detail: "Created as super admin (npm run admin:create)" } });
  return { ok: true, created: true, password, email };
}
