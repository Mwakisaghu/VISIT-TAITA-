import { ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const UNVERIFIED_MESSAGE =
  "Please verify your email address first — we sent you a link when you registered. You can send a new one from your account page.";

/**
 * Whether this person may do something that is public or emails them: write a review, apply to the Field Crew. Read from
 * the database every time (never the sign-in token), so verifying takes effect immediately. Staff are exempt — their
 * accounts are set up by us, and an unreachable address must never lock an admin out of their own tools.
 */
export async function requireVerifiedEmail(userId: string, role: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (ADMIN_ROLES.includes(role)) return { ok: true };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
  if (!user) return { ok: false, error: "This account no longer exists." };
  return user.emailVerifiedAt ? { ok: true } : { ok: false, error: UNVERIFIED_MESSAGE };
}
