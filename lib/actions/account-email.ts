"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { consumeToken, findUsableToken } from "@/lib/account-tokens";
import { passwordChangedText } from "@/lib/account-emails";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/account-verification";
import { authOptions } from "@/lib/auth";
import { checkinBaseUrl } from "@/lib/checkin-url";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export type AccountEmailResult = { ok: true; already?: boolean } | { ok: false; error: string };

const HOUR_MS = 60 * 60 * 1000;
const INVALID_VERIFY = "This link isn't valid or has expired. You can send a new one from your account page.";
const INVALID_RESET = "This link isn't valid or has expired. Request a new password reset to get a fresh one.";
const emailSchema = z.string().trim().toLowerCase().email().max(254);

// SECURITY: server actions are public endpoints, so the visitor's address is read from the request here — never accepted as an
// argument, where a caller could simply invent one to dodge the limits.
function clientIp(): string {
  const h = headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** Confirms an address from the emailed link. Single use; only the newest link works. */
export async function verifyEmail(token: string): Promise<AccountEmailResult> {
  if (!await checkRateLimit(`verify-email:${clientIp()}`, 60, HOUR_MS)) return { ok: false, error: "Too many attempts — please try again later." };

  const found = await findUsableToken(prisma, token, "VERIFY_EMAIL");
  if (!found) return { ok: false, error: INVALID_VERIFY };

  const done = await prisma.$transaction(async (tx) => {
    if (!(await consumeToken(tx, found.id))) return false; // someone else used it first
    await tx.user.updateMany({ where: { id: found.userId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
    await tx.accountToken.deleteMany({ where: { userId: found.userId, purpose: "VERIFY_EMAIL", usedAt: null } });
    return true;
  });
  if (!done) return { ok: false, error: INVALID_VERIFY };
  revalidatePath("/account");
  return { ok: true };
}

/** Sends the signed-in person a new verification link. */
export async function resendVerification(): Promise<AccountEmailResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, error: "Please sign in." };
  const userId = session.user.id;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
  if (!user) return { ok: false, error: "This account no longer exists." };
  if (user.emailVerifiedAt) return { ok: true, already: true };

  if (!await checkRateLimit(`verify-resend:${userId}`, 3, HOUR_MS)) return { ok: false, error: "You've asked for several emails already — please check your inbox (and spam folder), or try again in a little while." };
  if ((await sendVerificationEmail(userId)) === "skipped") return { ok: false, error: "Email verification isn't available yet." };
  return { ok: true };
}

/**
 * Starts a password reset. The answer is the SAME whether or not an account has this address, so it can't be used to find out
 * who has an account here. It is rate-limited by visitor and by address, so nobody can be flooded with reset emails.
 */
export async function requestPasswordReset(rawEmail: string): Promise<AccountEmailResult> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  const email = parsed.data;

  if (!await checkRateLimit(`reset:ip:${clientIp()}`, 10, HOUR_MS)) return { ok: false, error: "Too many requests — please try again later." };
  if (!await checkRateLimit(`reset:email:${email}`, 3, HOUR_MS)) return { ok: true }; // quietly: don't let one address be mail-bombed
  if (!checkinBaseUrl()) return { ok: false, error: "Password reset isn't available yet." };

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) await sendPasswordResetEmail(user.id);
  } catch (err) {
    console.error("[account] reset request failed", err); // never reveal, to the caller, that something happened for this address
  }
  return { ok: true };
}

/**
 * Sets a new password from the emailed link. The link works once and for an hour. Clicking it proves the person controls the
 * address, so it also verifies it. It ends every other sign-in (see lib/auth.ts), clears any other outstanding links, and
 * emails the owner that the password changed.
 */
export async function resetPassword(token: string, newPassword: string): Promise<AccountEmailResult> {
  if (!await checkRateLimit(`reset-submit:${clientIp()}`, 20, HOUR_MS)) return { ok: false, error: "Too many attempts — please try again later." };

  if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 72) {
    return { ok: false, error: "Choose a password of 8 to 72 characters." };
  }
  const found = await findUsableToken(prisma, token, "RESET_PASSWORD");
  if (!found) return { ok: false, error: INVALID_RESET };

  const passwordHash = await bcrypt.hash(newPassword, 10); // slow on purpose, so done before the transaction

  const user = await prisma.$transaction(async (tx) => {
    if (!(await consumeToken(tx, found.id))) return null; // someone else used it first
    const now = new Date();
    const updated = await tx.user.update({ where: { id: found.userId }, data: { passwordHash, passwordChangedAt: now }, select: { name: true, email: true } });
    await tx.user.updateMany({ where: { id: found.userId, emailVerifiedAt: null }, data: { emailVerifiedAt: now } });
    await tx.accountToken.deleteMany({ where: { userId: found.userId, usedAt: null } });
    return updated;
  });
  if (!user) return { ok: false, error: INVALID_RESET };

  // Best effort, after the fact: tell the owner, in case it wasn't them.
  await sendEmail({ to: user.email, subject: "Your Visit Taita password was changed", text: passwordChangedText(user.name) });
  revalidatePath("/account");
  return { ok: true };
}
