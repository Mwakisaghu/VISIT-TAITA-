"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { passwordChangedText } from "@/lib/account-emails";
import { checkPasswordChange, cleanName, type NameCode } from "@/lib/account-security-rules";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { checkChosenPassword } from "@/lib/password-check";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { PasswordCheck } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

// These actions return a CODE, never an English sentence, so the page can say it in the person's own language.
// Every one acts only on the person who is signed in (there is no user id to pass in), and every one is limited per person.
export type SecurityCode = "not_signed_in" | "too_many" | "gone" | "failed";
export type NameResult = { ok: true; name: string } | { ok: false; code: NameCode | SecurityCode };
export type PasswordResult = { ok: true } | { ok: false; code: "wrong_password" | "same_password" | "missing_current" | "weak" | SecurityCode; policy?: Exclude<PasswordCheck, { ok: true }> };
export type SignOutResult = { ok: true } | { ok: false; code: SecurityCode };

const HOUR_MS = 60 * 60 * 1000;

/** Changes the signed-in person's name. */
export async function updateMyName(raw: string): Promise<NameResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, code: "not_signed_in" };
  if (!(await checkRateLimit(`change-name:${session.user.id}`, 10, HOUR_MS))) return { ok: false, code: "too_many" };
  const clean = cleanName(raw);
  if (!clean.ok) return { ok: false, code: clean.code };
  try {
    const result = await prisma.user.updateMany({ where: { id: session.user.id }, data: { name: clean.name } });
    if (result.count === 0) return { ok: false, code: "gone" };
  } catch {
    return { ok: false, code: "failed" };
  }
  revalidatePath("/account");
  return { ok: true, name: clean.name };
}

/**
 * Changes the signed-in person's password. They must give the CURRENT password (a stolen session alone must not be enough), and every attempt, right or wrong, counts toward the limit.
 * The current password is checked FIRST, so a wrong one reveals nothing about the rules for the new one. On success every sign-in ends (the sign-in code compares when each began with
 * `passwordChangedAt`), anything waiting to reset the password is cancelled, and the owner is emailed in case it was not them.
 */
export async function changeMyPassword(current: string, next: string): Promise<PasswordResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, code: "not_signed_in" };
  const userId = session.user.id;
  if (!(await checkRateLimit(`change-password:${userId}`, 5, HOUR_MS))) return { ok: false, code: "too_many" };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, passwordHash: true } });
  if (!user) return { ok: false, code: "gone" };
  if (typeof current !== "string" || current.length === 0) return { ok: false, code: "missing_current" };
  if (!(await verifyPassword(current, user.passwordHash))) return { ok: false, code: "wrong_password" };

  const check = checkPasswordChange(current, next, { email: user.email, name: user.name });
  if (!check.ok) return check.code === "weak" ? { ok: false, code: "weak", policy: check.policy } : { ok: false, code: check.code };

  const full = await checkChosenPassword(next, { email: user.email, name: user.name }); // the same rules, then: has it leaked in a known breach?
  if (!full.ok) return { ok: false, code: "weak", policy: full };

  const passwordHash = await hashPassword(next); // slow on purpose, so done before the transaction
  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash, passwordChangedAt: new Date() } });
      await tx.accountToken.deleteMany({ where: { userId: user.id, usedAt: null } }); // a reset link sent earlier must not work any more
    });
  } catch {
    return { ok: false, code: "failed" };
  }
  await sendEmail({ to: user.email, subject: "Your Visit Taita password was changed", text: passwordChangedText(user.name) }); // best effort, after the fact
  revalidatePath("/account");
  return { ok: true };
}

/** Ends every sign-in of the signed-in person, on every device (this one is ended by the page right after). */
export async function signOutEverywhere(): Promise<SignOutResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, code: "not_signed_in" };
  if (!(await checkRateLimit(`sign-out-everywhere:${session.user.id}`, 10, HOUR_MS))) return { ok: false, code: "too_many" };
  try {
    const result = await prisma.user.updateMany({ where: { id: session.user.id }, data: { sessionsRevokedAt: new Date() } });
    if (result.count === 0) return { ok: false, code: "gone" };
  } catch {
    return { ok: false, code: "failed" };
  }
  return { ok: true };
}
