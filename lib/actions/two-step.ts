"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { twoStepChangedText } from "@/lib/account-emails";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { qrSvg } from "@/lib/qr-code";
import { checkRateLimit } from "@/lib/rate-limit";
import { twoStepAvailable } from "@/lib/two-step/crypto";
import { parseMoneyFrom, requiresTwoStep } from "@/lib/two-step/policy";
import { beginSetup, confirmSetup, newRecoveryCodes, turnOff, twoStepStatus, verifyLoginCode } from "@/lib/two-step/service";
import { groupSecret } from "@/lib/two-step/totp";

// These actions return a CODE, never an English sentence, so the page can say it in the person's own language. Every one acts only on the person who is signed in (there is no user id to pass in).
export type TwoStepCode = "not_signed_in" | "unavailable" | "already_on" | "not_started" | "not_on" | "wrong_code" | "wrong_password" | "too_many" | "required" | "failed";
export type TwoStepState = { available: boolean; enabled: boolean; recoveryLeft: number; required: boolean; canTurnOff: boolean };

const MIN15 = 15 * 60 * 1000;
async function who() {
  const session = await getServerSession(authOptions); const id = (session?.user as { id?: string } | undefined)?.id; if (!id) return null;
  // The REAL role is read from the database: a person still setting up two-step is held at a restricted role in their session, and the rule about who must use it depends on the real one.
  return prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, passwordHash: true } });
}
async function ip(): Promise<string> { const h = await headers(); return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown"; }
const rule = () => ({ available: twoStepAvailable(), moneyRolesFrom: parseMoneyFrom() });
const audit = (u: { id: string; email: string }, action: string) => prisma.adminAuditLog.create({ data: { actorId: u.id, actorEmail: u.email, action, targetUserId: u.id, targetEmail: u.email } }).catch(() => null);

export async function getTwoStepState(): Promise<TwoStepState | null> {
  const u = await who(); if (!u) return null;
  const available = twoStepAvailable(); const required = requiresTwoStep(u.role, rule());
  if (!available) return { available: false, enabled: false, recoveryLeft: 0, required: false, canTurnOff: true };
  const s = await twoStepStatus(u.id); return { available, enabled: s.enabled, recoveryLeft: s.recoveryLeft, required, canTurnOff: !required };
}

/** Step 1: a new secret, as text to type and as a QR code (made here, from our own text, so nothing about the secret goes to any other service). */
export async function startTwoStepSetup(): Promise<{ ok: true; key: string; qr: string } | { ok: false; code: TwoStepCode }> {
  const u = await who(); if (!u) return { ok: false, code: "not_signed_in" };
  const r = await beginSetup(u.id, u.email); if (!r.ok) return { ok: false, code: r.code };
  return { ok: true, key: groupSecret(r.secret), qr: await qrSvg(r.uri) };
}

/** Step 2: the code from the app. If right, two-step is on and the recovery codes are returned (this once). */
export async function confirmTwoStepSetup(code: string): Promise<{ ok: true; codes: string[] } | { ok: false; code: TwoStepCode }> {
  const u = await who(); if (!u) return { ok: false, code: "not_signed_in" };
  const r = await confirmSetup(u.id, code); if (!r.ok) return { ok: false, code: r.code };
  await audit(u, "user.twostep_on"); await sendEmail({ to: u.email, subject: "Two-step sign-in was turned on", text: twoStepChangedText(u.name, true) }); // best effort, after the fact
  revalidatePath("/account"); return { ok: true, codes: r.codes };
}

/** Proof it is really the owner, for the actions that matter: the password AND a current code (or a recovery code), limited per person. */
async function reauthenticate(u: { id: string; passwordHash: string }, password: unknown, code: unknown): Promise<TwoStepCode | null> {
  if (!(await checkRateLimit(`2fa-sensitive:${u.id}`, 6, MIN15))) return "too_many";
  if (typeof password !== "string" || !(await verifyPassword(password, u.passwordHash))) return "wrong_password";
  const c = await verifyLoginCode(u.id, code, { ip: await ip() });
  return c.ok ? null : c.reason === "rate_limited" ? "too_many" : c.reason === "unavailable" ? "unavailable" : "wrong_code";
}

/** Ten new recovery codes (the old ones stop working). */
export async function makeNewRecoveryCodes(password: string, code: string): Promise<{ ok: true; codes: string[] } | { ok: false; code: TwoStepCode }> {
  const u = await who(); if (!u) return { ok: false, code: "not_signed_in" };
  if (!(await twoStepStatus(u.id)).enabled) return { ok: false, code: "not_on" };
  const bad = await reauthenticate(u, password, code); if (bad) return { ok: false, code: bad };
  const codes = await newRecoveryCodes(u.id); if (!codes) return { ok: false, code: "unavailable" };
  await audit(u, "user.twostep_codes"); revalidatePath("/account"); return { ok: true, codes };
}

/** Turns two-step off. Refused for anyone it is required of. */
export async function turnOffTwoStep(password: string, code: string): Promise<{ ok: true } | { ok: false; code: TwoStepCode }> {
  const u = await who(); if (!u) return { ok: false, code: "not_signed_in" };
  if (requiresTwoStep(u.role, rule())) return { ok: false, code: "required" };
  if (!(await twoStepStatus(u.id)).enabled) return { ok: false, code: "not_on" };
  const bad = await reauthenticate(u, password, code); if (bad) return { ok: false, code: bad };
  await turnOff(u.id);
  await audit(u, "user.twostep_off"); await sendEmail({ to: u.email, subject: "Two-step sign-in was turned off", text: twoStepChangedText(u.name, false) });
  revalidatePath("/account"); return { ok: true };
}
