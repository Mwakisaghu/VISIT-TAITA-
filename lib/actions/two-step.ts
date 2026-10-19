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
import { canTrustBrowser, canUseEmailMethod, parseMoneyFrom, requiresTwoStep } from "@/lib/two-step/policy";
import { sendEmailCode } from "@/lib/two-step/email-code";
import { beginEmailSetup, beginSetup, confirmEmailSetup, confirmSetup, newRecoveryCodes, turnOff, twoStepStatus, verifyLoginCode } from "@/lib/two-step/service";
import { countBrowsers } from "@/lib/two-step/trusted";
import { groupSecret } from "@/lib/two-step/totp";

// These actions return a CODE, never an English sentence, so the page can say it in the person's own language. Every one acts only on the person who is signed in (there is no user id to pass in).
export type TwoStepCode = "not_signed_in" | "unavailable" | "already_on" | "not_started" | "not_on" | "wrong_code" | "wrong_password" | "too_many" | "required" | "not_allowed" | "email_not_verified" | "failed";
export type TwoStepState = { available: boolean; enabled: boolean; recoveryLeft: number; required: boolean; canTurnOff: boolean; method: "TOTP" | "EMAIL" | null; canEmail: boolean; canTrust: boolean; browsers: number; email: string };

const MIN15 = 15 * 60 * 1000;
async function who() {
  const session = await getServerSession(authOptions); const id = (session?.user as { id?: string } | undefined)?.id; if (!id) return null;
  // The REAL role is read from the database: a person still setting up two-step is held at a restricted role in their session, and the rule about who must use it depends on the real one.
  return prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, passwordHash: true, emailVerifiedAt: true } });
}
async function ip(): Promise<string> { const h = await headers(); return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown"; }
const rule = () => ({ available: twoStepAvailable(), moneyRolesFrom: parseMoneyFrom() });
const audit = (u: { id: string; email: string }, action: string) => prisma.adminAuditLog.create({ data: { actorId: u.id, actorEmail: u.email, action, targetUserId: u.id, targetEmail: u.email } }).catch(() => null);

export async function getTwoStepState(): Promise<TwoStepState | null> {
  const u = await who(); if (!u) return null;
  const available = twoStepAvailable(); const required = requiresTwoStep(u.role, rule());
  const base = { method: null, canEmail: false, canTrust: false, browsers: 0, email: u.email } as const;
  if (!available) return { available: false, enabled: false, recoveryLeft: 0, required: false, canTurnOff: true, ...base };
  const s = await twoStepStatus(u.id); const canTrust = canTrustBrowser(u.role);
  let browsers = 0; if (s.enabled && canTrust) { try { browsers = await countBrowsers(u.id); } catch { /* shown as none */ } }
  // The emailed code is offered only to someone who is not required to use the app (never staff or money-handling roles) and whose address is verified.
  return { available, enabled: s.enabled, recoveryLeft: s.recoveryLeft, required, canTurnOff: !required, method: s.method, canEmail: !s.enabled && canUseEmailMethod(u.role) && !!u.emailVerifiedAt, canTrust, browsers, email: u.email };
}

/** Step 1: a new secret, as text to type and as a QR code (made here, from our own text, so nothing about the secret goes to any other service). */
export async function startTwoStepSetup(): Promise<{ ok: true; key: string; qr: string } | { ok: false; code: TwoStepCode }> {
  const u = await who(); if (!u) return { ok: false, code: "not_signed_in" };
  const r = await beginSetup(u.id, u.email, { replaceEmail: requiresTwoStep(u.role, rule()) }); if (!r.ok) return { ok: false, code: r.code };
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

const mask = (email: string): string => { const [l, d] = email.split("@"); return `${l.slice(0, 1)}${"\u2022".repeat(Math.max(2, Math.min(6, l.length - 1)))}@${d}`; };

/** The email method, step 1 (members only, and only with a verified address): a code is emailed to the person's own address. */
export async function startEmailSetup(): Promise<{ ok: true; sentTo: string } | { ok: false; code: TwoStepCode }> {
  const u = await who(); if (!u) return { ok: false, code: "not_signed_in" };
  if (!canUseEmailMethod(u.role)) return { ok: false, code: "not_allowed" };
  if (!u.emailVerifiedAt) return { ok: false, code: "email_not_verified" };
  const r = await beginEmailSetup({ id: u.id, name: u.name, email: u.email }, { mail: sendEmail, ip: await ip() }); if (!r.ok) return { ok: false, code: r.code };
  return { ok: true, sentTo: mask(u.email) };
}
/** The email method, step 2: the emailed code. If right, two-step is on and the recovery codes are returned (this once). */
export async function confirmEmailTwoStepSetup(code: string): Promise<{ ok: true; codes: string[] } | { ok: false; code: TwoStepCode }> {
  const u = await who(); if (!u) return { ok: false, code: "not_signed_in" };
  if (!canUseEmailMethod(u.role)) return { ok: false, code: "not_allowed" };
  const r = await confirmEmailSetup(u.id, code); if (!r.ok) return { ok: false, code: r.code };
  await audit(u, "user.twostep_on"); await sendEmail({ to: u.email, subject: "Two-step sign-in was turned on", text: twoStepChangedText(u.name, true) });
  revalidatePath("/account"); return { ok: true, codes: r.codes };
}
/** Someone on the email method who must confirm a sensitive change asks for a code here (the app's codes come from the app). */
export async function emailMeACode(): Promise<{ ok: true; sentTo: string } | { ok: false; code: TwoStepCode }> {
  const u = await who(); if (!u) return { ok: false, code: "not_signed_in" };
  const s = await twoStepStatus(u.id); if (s.method !== "EMAIL") return { ok: false, code: "not_on" };
  const r = await sendEmailCode({ id: u.id, name: u.name, email: u.email }, { mail: sendEmail, ip: await ip() });
  return r.ok ? { ok: true, sentTo: mask(u.email) } : { ok: false, code: r.reason === "rate_limited" ? "too_many" : "unavailable" };
}
