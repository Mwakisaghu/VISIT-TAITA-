"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { checkinBaseUrl } from "@/lib/checkin-url";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { currentManager } from "@/lib/user-admin-server";
import { twoStepAvailable } from "@/lib/two-step/crypto";
import { cancelByAdmin, cancelByToken, requestReset } from "@/lib/two-step/reset";
import { twoStepEnabled } from "@/lib/two-step/service";

// Super admins asking to reset ANOTHER person's two-step sign-in (see lib/two-step/reset.ts), and the person cancelling it from their emailed link. These return codes, never sentences.
export type ResetActionCode = "not_allowed" | "not_found" | "not_super_admin" | "self" | "no_two_step" | "already_pending" | "no_site_address" | "unavailable" | "too_many" | "invalid" | "failed";
export type ResetActionResult = { ok: true } | { ok: false; code: ResetActionCode };
const HOUR = 60 * 60 * 1000;
async function ip(): Promise<string> { const h = await headers(); return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown"; }
const refresh = (userId?: string) => { revalidatePath("/admin/users"); revalidatePath("/admin/users/audit"); if (userId) revalidatePath(`/admin/users/${userId}`); };

export async function requestTwoStepReset(userId: string): Promise<ResetActionResult> {
  const actor = await currentManager(); // honours a restricted session and the real, fresh role
  if (!actor || actor.role !== "SUPER_ADMIN") return { ok: false, code: "not_allowed" };
  if (!twoStepAvailable()) return { ok: false, code: "unavailable" };
  if (!(await checkRateLimit(`2fa-reset-ask:${actor.id}`, 10, HOUR))) return { ok: false, code: "too_many" };
  const target = await prisma.user.findUnique({ where: { id: String(userId) }, select: { id: true, name: true, email: true } });
  if (!target) return { ok: false, code: "not_found" };
  const r = await requestReset(actor, target, await twoStepEnabled(target.id), { mail: sendEmail, base: checkinBaseUrl() });
  refresh(target.id); return r.ok ? { ok: true } : { ok: false, code: r.code };
}

export async function cancelTwoStepReset(resetId: string): Promise<ResetActionResult> {
  const actor = await currentManager();
  if (!actor || actor.role !== "SUPER_ADMIN") return { ok: false, code: "not_allowed" };
  if (!(await checkRateLimit(`2fa-reset-cancel-admin:${actor.id}`, 30, HOUR))) return { ok: false, code: "too_many" };
  const r = await cancelByAdmin(actor, String(resetId), { mail: sendEmail }); refresh(); return r.ok ? { ok: true } : { ok: false, code: r.code };
}

/** The emailed link. Public (the person may not be able to sign in), so it is limited by connection and answers every bad link the same way. */
export async function cancelResetWithToken(token: string): Promise<{ ok: true } | { ok: false; code: "invalid" | "too_many" }> {
  if (!(await checkRateLimit(`2fa-reset-cancel-link:${await ip()}`, 20, HOUR))) return { ok: false, code: "too_many" };
  const r = await cancelByToken(token, { mail: sendEmail }); refresh(); return r.ok ? { ok: true } : { ok: false, code: "invalid" };
}
