// A super admin asking to switch off ANOTHER person's two-step sign-in (they lost their phone and their recovery codes). It is built so it cannot be done quietly or by surprise:
//  * it waits 24 hours; the person is emailed at once with a link to cancel it, the other super admins are told, and every step is in the audit log;
//  * it takes effect at the person's next sign-in (after their password is checked), so no scheduled job is needed, and it signs them out everywhere;
//  * only a fingerprint of the cancel link is stored; a request that is cancelled, used or long overdue (7 days after it was due) can never take effect.
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { turnOff, type TwoStepDb } from "@/lib/two-step/service";
import { twoStepResetCancelledText, twoStepResetDoneText, twoStepResetNoticeText, twoStepResetRequestedText } from "@/lib/account-emails";

export const RESET_DELAY_MS = 24 * 60 * 60 * 1000;
export const RESET_EXPIRES_AFTER_DUE_MS = 7 * 24 * 60 * 60 * 1000;

export type ResetRow = { id: string; userId: string; requestedById: string; requestedByEmail: string; executeAfter: Date; cancelTokenHash: string; cancelledAt: Date | null; cancelledBy: string | null; completedAt: Date | null; createdAt: Date };
export interface ResetDb extends TwoStepDb {
  twoStepReset: {
    create(a: { data: { userId: string; requestedById: string; requestedByEmail: string; executeAfter: Date; cancelTokenHash: string } }): Promise<ResetRow>;
    findFirst(a: { where: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc"> }): Promise<ResetRow | null>;
    updateMany(a: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  };
  user: {
    findUnique(a: { where: { id: string }; select?: Record<string, boolean> }): Promise<{ id: string; name: string; email: string } | null>;
    findMany(a: { where: Record<string, unknown>; select?: Record<string, boolean> }): Promise<{ id: string; name: string; email: string }[]>;
    update(a: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  };
  adminAuditLog: { create(a: { data: Record<string, unknown> }): Promise<unknown> };
}
export const liveResetDb = (): ResetDb => prisma as unknown as ResetDb;
export type Mail = (m: { to: string; subject: string; text: string }) => Promise<unknown>;
type Deps = { db?: ResetDb; mail?: Mail; now?: number; base?: string | null };

export const hashCancelToken = (token: string): string => createHash("sha256").update(token).digest("hex");
export const newCancelToken = (): string => randomBytes(32).toString("base64url");
/** Fewer than two active super admins means one lost phone can lock the site's administration out. */
export const needsSecondSuperAdmin = (activeSuperAdmins: number): boolean => activeSuperAdmins < 2;

export type ResetVerdict = { ok: true } | { ok: false; code: "not_super_admin" | "self" | "no_two_step" | "already_pending" };
/** May this actor ask to reset this person's two-step? */
export function checkReset(a: { actor: { id: string; role: string }; target: { id: string }; targetHasTwoStep: boolean; pending: boolean }): ResetVerdict {
  if (a.actor.role !== "SUPER_ADMIN") return { ok: false, code: "not_super_admin" };
  if (a.actor.id === a.target.id) return { ok: false, code: "self" }; // nobody resets their own: that is what recovery codes are for
  if (!a.targetHasTwoStep) return { ok: false, code: "no_two_step" };
  if (a.pending) return { ok: false, code: "already_pending" };
  return { ok: true };
}

const whenText = (d: Date) => `${d.toLocaleString("en-GB", { timeZone: "Africa/Nairobi", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })} (Nairobi time)`;
const audit = (db: ResetDb, who: { id?: string | null; email: string }, action: string, target: { id: string; email: string }, detail: string) =>
  db.adminAuditLog.create({ data: { actorId: who.id ?? null, actorEmail: who.email, action, targetUserId: target.id, targetEmail: target.email, detail } }).catch(() => null);
const send = async (mail: Mail | undefined, m: { to: string; subject: string; text: string }) => { if (!mail) return; try { await mail(m); } catch { /* a mail problem never stops the change itself; the audit log has it */ } };

/** The request still waiting for this person (not cancelled, not done, not long overdue), if any. */
export async function pendingFor(userId: string, { db = liveResetDb(), now = Date.now() }: Deps = {}): Promise<ResetRow | null> {
  return db.twoStepReset.findFirst({ where: { userId, cancelledAt: null, completedAt: null, executeAfter: { gt: new Date(now - RESET_EXPIRES_AFTER_DUE_MS) } }, orderBy: { createdAt: "desc" } });
}

export async function requestReset(actor: { id: string; name: string; email: string; role: string }, target: { id: string; name: string; email: string }, targetHasTwoStep: boolean, { db = liveResetDb(), mail, now = Date.now(), base }: Deps = {}):
  Promise<{ ok: true; id: string; executeAfter: Date } | { ok: false; code: "not_super_admin" | "self" | "no_two_step" | "already_pending" | "no_site_address" }> {
  const pending = await pendingFor(target.id, { db, now });
  const verdict = checkReset({ actor, target, targetHasTwoStep, pending: !!pending }); if (!verdict.ok) return verdict;
  if (!base) return { ok: false, code: "no_site_address" }; // the cancel link is what makes this safe: without a public address there is no way to send it, so nothing is started
  const token = newCancelToken(); const executeAfter = new Date(now + RESET_DELAY_MS);
  const row = await db.twoStepReset.create({ data: { userId: target.id, requestedById: actor.id, requestedByEmail: actor.email, executeAfter, cancelTokenHash: hashCancelToken(token) } });
  const when = whenText(executeAfter);
  await audit(db, actor, "user.twostep_reset_requested", target, `Takes effect after ${executeAfter.toISOString()}; ${target.email} was emailed a link to cancel it.`);
  await send(mail, { to: target.email, subject: "A reset of your two-step sign-in was requested", text: twoStepResetRequestedText(target.name, actor.name, when, `${base}/two-step/cancel-reset?token=${encodeURIComponent(token)}`) });
  const others = await db.user.findMany({ where: { role: "SUPER_ADMIN", suspendedAt: null, id: { not: target.id } }, select: { id: true, name: true, email: true } });
  for (const o of others) await send(mail, { to: o.email, subject: `Two-step reset requested for ${target.name}`, text: twoStepResetNoticeText(actor.name, target.name, target.email, when) });
  return { ok: true, id: row.id, executeAfter };
}

/** Cancels by the secret in the emailed link. Wrong, used, cancelled and overdue links all give the same answer, so the link cannot be probed. */
export async function cancelByToken(token: unknown, { db = liveResetDb(), mail, now = Date.now() }: Deps = {}): Promise<{ ok: true } | { ok: false; code: "invalid" }> {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) return { ok: false, code: "invalid" };
  const row = await db.twoStepReset.findFirst({ where: { cancelTokenHash: hashCancelToken(token), cancelledAt: null, completedAt: null, executeAfter: { gt: new Date(now - RESET_EXPIRES_AFTER_DUE_MS) } } });
  if (!row) return { ok: false, code: "invalid" };
  const took = await db.twoStepReset.updateMany({ where: { id: row.id, cancelledAt: null, completedAt: null }, data: { cancelledAt: new Date(now), cancelledBy: "the account owner (email link)" } });
  if (took.count !== 1) return { ok: false, code: "invalid" };
  const u = await db.user.findUnique({ where: { id: row.userId }, select: { id: true, name: true, email: true } });
  if (u) { await audit(db, { email: u.email }, "user.twostep_reset_cancelled", u, "Cancelled by the account owner from the emailed link."); await send(mail, { to: row.requestedByEmail, subject: `Two-step reset for ${u.name} was cancelled`, text: twoStepResetCancelledText("there", `${u.name} cancelled it from the emailed link`) }); }
  return { ok: true };
}

/** Cancels from the admin area; any super admin may. */
export async function cancelByAdmin(actor: { id: string; role: string; email: string }, resetId: string, { db = liveResetDb(), mail, now = Date.now() }: Deps = {}): Promise<{ ok: true } | { ok: false; code: "not_super_admin" | "invalid" }> {
  if (actor.role !== "SUPER_ADMIN") return { ok: false, code: "not_super_admin" };
  const took = await db.twoStepReset.updateMany({ where: { id: resetId, cancelledAt: null, completedAt: null }, data: { cancelledAt: new Date(now), cancelledBy: actor.email } });
  if (took.count !== 1) return { ok: false, code: "invalid" };
  const row = await db.twoStepReset.findFirst({ where: { id: resetId } });
  const u = row ? await db.user.findUnique({ where: { id: row.userId }, select: { id: true, name: true, email: true } }) : null;
  if (u) { await audit(db, actor, "user.twostep_reset_cancelled", u, `Cancelled by ${actor.email}.`); await send(mail, { to: u.email, subject: "The reset of your two-step sign-in was cancelled", text: twoStepResetCancelledText(u.name, `cancelled by ${actor.email}`) }); }
  return { ok: true };
}

/**
 * Called when someone has just proved their password: if a request for them is DUE (24 hours passed, not cancelled, not overdue) it takes effect now. The step is claimed atomically, so two
 * simultaneous sign-ins cannot both apply it. It switches off the secret and recovery codes, signs them out everywhere, writes the audit entry and emails them.
 */
export async function executeDueReset(userId: string, { db = liveResetDb(), mail, now = Date.now() }: Deps = {}): Promise<{ done: boolean }> {
  const row = await db.twoStepReset.findFirst({ where: { userId, cancelledAt: null, completedAt: null, executeAfter: { lte: new Date(now), gt: new Date(now - RESET_EXPIRES_AFTER_DUE_MS) } }, orderBy: { createdAt: "desc" } });
  if (!row) return { done: false };
  const claimed = await db.twoStepReset.updateMany({ where: { id: row.id, completedAt: null, cancelledAt: null }, data: { completedAt: new Date(now) } });
  if (claimed.count !== 1) return { done: false };
  await turnOff(userId, db);
  await db.user.update({ where: { id: userId }, data: { sessionsRevokedAt: new Date(now) } });
  const u = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
  if (u) { await audit(db, { id: row.requestedById, email: row.requestedByEmail }, "user.twostep_reset_done", u, `Took effect at their next sign-in, as requested by ${row.requestedByEmail}.`); await send(mail, { to: u.email, subject: "Your two-step sign-in was reset", text: twoStepResetDoneText(u.name) }); }
  return { done: true };
}
