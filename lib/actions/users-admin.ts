"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { sendPasswordResetEmail, sendStaffInviteEmail, sendVerificationEmail } from "@/lib/account-verification";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { currentManager, type ManagerActor } from "@/lib/user-admin-server";
import { checkActOn, checkReinstate, checkRoleChange, checkSuspend, isPendingInvite, roleLabel, validateInvite } from "@/lib/user-admin";

export type UsersAdminResult = { success?: true; id?: string; message?: string; error?: string; existingId?: string };

const HOUR = 60 * 60 * 1000;
const NOT_ALLOWED: UsersAdminResult = { error: "Admin access required." };
const SERIALIZABLE = { isolationLevel: "Serializable" as const };

const targetFields = { id: true, name: true, email: true, role: true, emailVerifiedAt: true, passwordChangedAt: true, invitedAt: true, suspendedAt: true } as const;

type Tx = Pick<typeof prisma, "user" | "adminAuditLog">;
const audit = (db: Tx, actor: ManagerActor, action: string, target: { id: string; email: string } | null, detail?: string) =>
  db.adminAuditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action, targetUserId: target?.id ?? null, targetEmail: target?.email ?? null, detail: detail ?? null } });

const refresh = (id?: string) => { revalidatePath("/admin/users"); revalidatePath("/admin/users/audit"); if (id) revalidatePath(`/admin/users/${id}`); };
const busy: UsersAdminResult = { error: "That was busy — please try again." };
const isConflict = (e: unknown) => (e as { code?: string })?.code === "P2034"; // a serialization conflict between two simultaneous changes

/** Creates a staff account and emails the person a link to choose their OWN password. Nobody types, sees or is sent a password. */
export async function inviteStaff(formData: FormData): Promise<UsersAdminResult> {
  const actor = await currentManager();
  if (!actor) return NOT_ALLOWED;
  if (!await checkRateLimit(`invite-staff:${actor.id}`, 20, HOUR)) return { error: "You've sent a lot of invitations in the last hour — please try again later." };

  const v = validateInvite({ actor, name: formData.get("name"), email: formData.get("email"), role: formData.get("role") });
  if (!v.ok) return { error: v.error };

  const existing = await prisma.user.findUnique({ where: { email: v.email }, select: { id: true } });
  if (existing) return { error: "There's already an account with that email. Find them under Users and change their role there.", existingId: existing.id };

  // An unusable password (random, thrown away): the account can only be entered through the emailed link.
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  let created: { id: string };
  try {
    created = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { name: v.name, email: v.email, passwordHash, role: v.role as never, invitedAt: new Date() }, select: { id: true } });
      await audit(tx, actor, "user.invite", { id: u.id, email: v.email }, `Invited as ${roleLabel(v.role)}`);
      return u;
    });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") return { error: "There's already an account with that email." }; // two admins inviting at once
    throw e;
  }

  let emailed = false;
  try {
    emailed = (await sendStaffInviteEmail(created.id, actor.name, roleLabel(v.role))) === "sent";
  } catch (e) {
    console.error("[users] invitation email failed:", (e as Error).message);
  }
  refresh();
  return { success: true, id: created.id, message: emailed ? `Invitation sent to ${v.email}. They have 7 days to choose a password.` : `Account created for ${v.email}, but no email could be sent (check that email is set up). Use "Send invitation again" on their page once it is.` };
}

export async function changeRole(userId: string, newRole: string): Promise<UsersAdminResult> {
  const actor = await currentManager();
  if (!actor) return NOT_ALLOWED;
  if (!await checkRateLimit(`user-admin:${actor.id}`, 60, HOUR)) return { error: "Too many changes in the last hour — please try again later." };
  try {
    return await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: String(userId) }, select: targetFields });
      if (!target) return { error: "That account no longer exists." };
      const activeSuperAdmins = await tx.user.count({ where: { role: "SUPER_ADMIN", suspendedAt: null } });
      const verdict = checkRoleChange({ actor, target, newRole: String(newRole), activeSuperAdmins });
      if (!verdict.ok) return { error: verdict.error };
      // Taking staff access away ends their sign-ins at once; a promotion shows up the next time their session is refreshed.
      const demoting = (["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"] as string[]).includes(target.role) && !(["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER"] as string[]).includes(newRole);
      await tx.user.update({ where: { id: target.id }, data: { role: newRole as never, ...(demoting ? { sessionsRevokedAt: new Date() } : {}) } });
      await audit(tx, actor, "user.role", target, `${roleLabel(target.role)} → ${roleLabel(newRole)}`);
      refresh(target.id);
      return { success: true, id: target.id, message: `${target.name} is now ${roleLabel(newRole)}.` } as UsersAdminResult;
    }, SERIALIZABLE);
  } catch (e) {
    if (isConflict(e)) return busy;
    throw e;
  }
}

/** Suspends an account: it can't sign in, and any sign-in it has is ended. The reason is required (it is shown to other admins). */
export async function suspendUser(userId: string, reason: string): Promise<UsersAdminResult> {
  const actor = await currentManager();
  if (!actor) return NOT_ALLOWED;
  if (!await checkRateLimit(`user-admin:${actor.id}`, 60, HOUR)) return { error: "Too many changes in the last hour — please try again later." };
  const why = typeof reason === "string" ? reason.trim().replace(/\s+/g, " ") : "";
  if (why.length < 3 || why.length > 200) return { error: "Give a short reason (3–200 characters) — other admins will see it." };
  try {
    return await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: String(userId) }, select: targetFields });
      if (!target) return { error: "That account no longer exists." };
      const activeSuperAdmins = await tx.user.count({ where: { role: "SUPER_ADMIN", suspendedAt: null } });
      const verdict = checkSuspend({ actor, target, activeSuperAdmins });
      if (!verdict.ok) return { error: verdict.error };
      const now = new Date();
      await tx.user.update({ where: { id: target.id }, data: { suspendedAt: now, suspendedReason: why, sessionsRevokedAt: now } });
      await audit(tx, actor, "user.suspend", target, why);
      refresh(target.id);
      return { success: true, id: target.id, message: `${target.name} is suspended and has been signed out.` } as UsersAdminResult;
    }, SERIALIZABLE);
  } catch (e) {
    if (isConflict(e)) return busy;
    throw e;
  }
}

export async function reinstateUser(userId: string): Promise<UsersAdminResult> {
  const actor = await currentManager();
  if (!actor) return NOT_ALLOWED;
  const target = await prisma.user.findUnique({ where: { id: String(userId) }, select: targetFields });
  if (!target) return { error: "That account no longer exists." };
  const verdict = checkReinstate({ actor, target });
  if (!verdict.ok) return { error: verdict.error };
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.id }, data: { suspendedAt: null, suspendedReason: null } });
    await audit(tx, actor, "user.reinstate", target);
  });
  refresh(target.id);
  return { success: true, id: target.id, message: `${target.name} can sign in again.` };
}

/** Ends every sign-in this account has (all devices). Their password and role are untouched. */
export async function signOutEverywhere(userId: string): Promise<UsersAdminResult> {
  const actor = await currentManager();
  if (!actor) return NOT_ALLOWED;
  const target = await prisma.user.findUnique({ where: { id: String(userId) }, select: targetFields });
  if (!target) return { error: "That account no longer exists." };
  const verdict = checkActOn(actor, target);
  if (!verdict.ok) return { error: verdict.error };
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.id }, data: { sessionsRevokedAt: new Date() } });
    await audit(tx, actor, "user.signout", target);
  });
  refresh(target.id);
  return { success: true, id: target.id, message: `${target.name} has been signed out on every device.` };
}

/** Emails the person a link to choose a (new) password. A staff member who has never chosen one gets the invitation again instead. */
export async function sendPasswordLink(userId: string): Promise<UsersAdminResult> {
  const actor = await currentManager();
  if (!actor) return NOT_ALLOWED;
  const target = await prisma.user.findUnique({ where: { id: String(userId) }, select: targetFields });
  if (!target) return { error: "That account no longer exists." };
  const verdict = checkActOn(actor, target);
  if (!verdict.ok) return { error: verdict.error };
  if (target.suspendedAt) return { error: "This account is suspended. Reinstate it first." };
  if (!await checkRateLimit(`password-link:${target.id}`, 3, HOUR)) return { error: "A link was already sent to this person a few times in the last hour — please wait." };
  const pending = isPendingInvite(target);
  let outcome: string;
  try {
    outcome = pending ? await sendStaffInviteEmail(target.id, actor.name, roleLabel(target.role)) : await sendPasswordResetEmail(target.id);
  } catch (e) {
    console.error("[users] password link email failed:", (e as Error).message);
    return { error: "We couldn't send the email just now — please try again." };
  }
  if (outcome !== "sent") return { error: "No public site address is set, so a link can't be created. Set NEXT_PUBLIC_APP_URL." };
  await audit(prisma, actor, "user.reset_link", target, pending ? "Invitation sent again" : "Password reset link sent");
  refresh(target.id);
  return { success: true, id: target.id, message: pending ? `Invitation sent again to ${target.email}.` : `A password link was emailed to ${target.email}.` };
}

export async function sendVerificationLink(userId: string): Promise<UsersAdminResult> {
  const actor = await currentManager();
  if (!actor) return NOT_ALLOWED;
  const target = await prisma.user.findUnique({ where: { id: String(userId) }, select: targetFields });
  if (!target) return { error: "That account no longer exists." };
  const verdict = checkActOn(actor, target);
  if (!verdict.ok) return { error: verdict.error };
  if (target.emailVerifiedAt) return { error: "This email address is already verified." };
  if (target.suspendedAt) return { error: "This account is suspended. Reinstate it first." };
  if (!await checkRateLimit(`verify-link:${target.id}`, 3, HOUR)) return { error: "A link was already sent to this person a few times in the last hour — please wait." };
  let outcome: string;
  try {
    outcome = await sendVerificationEmail(target.id);
  } catch (e) {
    console.error("[users] verification email failed:", (e as Error).message);
    return { error: "We couldn't send the email just now — please try again." };
  }
  if (outcome !== "sent") return { error: "No public site address is set, so a link can't be created. Set NEXT_PUBLIC_APP_URL." };
  await audit(prisma, actor, "user.verify_link", target);
  refresh(target.id);
  return { success: true, id: target.id, message: `A verification link was emailed to ${target.email}.` };
}
