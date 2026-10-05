import { issueToken } from "@/lib/account-tokens";
import { resetText, verificationText } from "@/lib/account-emails";
import { checkinBaseUrl } from "@/lib/checkin-url";
import { emailConfigured, sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

// Deliberately NOT a "use server" file: server actions are public endpoints, and "send an email to this user id" must never be
// one. These are called only by trusted server code (the register route and the actions that check who is asking).

export type SendOutcome = "sent" | "skipped";

async function deliver(to: string, subject: string, text: string, url: string) {
  // Local development without email set up: print the link so the flow can still be tried. Never in production.
  if (!emailConfigured() && process.env.NODE_ENV !== "production") console.info(`[account] ${subject} — for ${to}: ${url}`);
  await sendEmail({ to, subject, text });
}

/** Emails this account a fresh verification link (any earlier unused one stops working). */
export async function sendVerificationEmail(userId: string): Promise<SendOutcome> {
  const base = checkinBaseUrl();
  if (!base) return "skipped"; // no public address to put in a link
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  if (!user) return "skipped";
  const raw = await issueToken(prisma, userId, "VERIFY_EMAIL");
  const url = `${base}/verify-email?token=${encodeURIComponent(raw)}`;
  await deliver(user.email, "Verify your Visit Taita email address", verificationText(user.name, url), url);
  return "sent";
}

/** Emails this account a password-reset link (any earlier unused one stops working). */
export async function sendPasswordResetEmail(userId: string): Promise<SendOutcome> {
  const base = checkinBaseUrl();
  if (!base) return "skipped";
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  if (!user) return "skipped";
  const raw = await issueToken(prisma, userId, "RESET_PASSWORD");
  const url = `${base}/reset-password?token=${encodeURIComponent(raw)}`;
  await deliver(user.email, "Reset your Visit Taita password", resetText(user.name, url), url);
  return "sent";
}
