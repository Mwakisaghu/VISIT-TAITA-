"use server";

import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { canTrustBrowser } from "@/lib/two-step/policy";
import { twoStepEnabled } from "@/lib/two-step/service";
import { forgetBrowsers, rememberBrowser, TRUST_COOKIE } from "@/lib/two-step/trusted";

// "Remember this browser for 30 days": the ONLY place the site sets this cookie (the privacy policy and its guard test describe it). Members only; never staff or money-handling roles.
export type TrustResult = { ok: true } | { ok: false; code: "not_allowed" | "too_many" };

/** Called right after a sign-in that passed a second step, when the person ticked the box. Refuses unless THIS session really passed one. */
export async function rememberThisBrowser(): Promise<TrustResult> {
  const session = await getServerSession(authOptions); const su = session?.user as { id?: string; mfa?: boolean; twoStepSetupRequired?: boolean } | undefined;
  if (!su?.id || su.mfa !== true || su.twoStepSetupRequired) return { ok: false, code: "not_allowed" };
  const u = await prisma.user.findUnique({ where: { id: su.id }, select: { id: true, role: true, suspendedAt: true } });
  if (!u || u.suspendedAt || !canTrustBrowser(u.role) || !(await twoStepEnabled(u.id))) return { ok: false, code: "not_allowed" };
  if (!(await checkRateLimit(`2fa-remember:${u.id}`, 10, 60 * 60 * 1000))) return { ok: false, code: "too_many" };
  const { token, expiresAt } = await rememberBrowser(u.id);
  const cookieJar = await cookies();
  cookieJar.set(TRUST_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt }); // not readable by scripts, only sent to this site
  return { ok: true };
}

/** Ends every remembered browser of the signed-in person (and clears this browser's cookie). */
export async function forgetMyBrowsers(): Promise<TrustResult> {
  const session = await getServerSession(authOptions); const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) return { ok: false, code: "not_allowed" };
  await forgetBrowsers(id); const cookieJar = await cookies(); cookieJar.delete(TRUST_COOKIE); return { ok: true };
}
