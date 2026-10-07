"use server";

import { revalidatePath } from "next/cache";
import { currentBookingUser } from "@/lib/booking-auth";
import { notifyPayoutSent } from "@/lib/payout-emails";
import { createPayouts, recordPayout, saveSettings } from "@/lib/payout-ops";
import { kes, maskPhone, normalizePayoutPhone, validateSettings } from "@/lib/payout";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export type PayoutResult = { ok: true; message: string } | { ok: false; error: string };
const denied = { ok: false as const, error: "Admin access required." };
const refresh = () => { revalidatePath("/admin/payouts"); revalidatePath("/partner/payouts"); };
const audit = (actor: { id: string; email: string }, action: string, host: { id: string; email: string } | null, detail: string) =>
  prisma.adminAuditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action, targetUserId: host?.id ?? null, targetEmail: host?.email ?? null, detail: detail.slice(0, 300) } }).catch(() => null);

/** A host registers (or changes) the M-Pesa number their payouts are sent to. Only for themselves. */
export async function savePayoutPhone(raw: string): Promise<PayoutResult> {
  const me = await currentBookingUser();
  if (!me || !(me.role === "PARTNER" || me.isAdmin)) return { ok: false, error: "Only hosts can set a payout number." };
  if (!rateLimit(`payout-phone:${me.id}`, 10, 60 * 60 * 1000)) return { ok: false, error: "You've changed this a lot of times — please try again in an hour." };
  const phone = normalizePayoutPhone(raw);
  if (!phone) return { ok: false, error: "That isn't a Safaricom number we can pay by M-Pesa. Use a number like 0712 345 678 (or 0112 345 678)." };
  const before = await prisma.user.findUnique({ where: { id: me.id }, select: { payoutPhone: true } });
  await prisma.user.update({ where: { id: me.id }, data: { payoutPhone: phone } });
  // A changed payout number is exactly what a thief who takes over an account would do, so it leaves a trail (masked).
  if (before?.payoutPhone !== phone) await audit(me, "payout.phone", me, `payout number ${before?.payoutPhone ? `changed from ${maskPhone(before.payoutPhone)} ` : "set "}to ${maskPhone(phone)}`);
  refresh();
  return { ok: true, message: `Saved. Your payouts will be sent to ${maskPhone(phone)}.` };
}

export async function savePayoutSettingsAction(commissionPercent: string, holdDays: string): Promise<PayoutResult> {
  const me = await currentBookingUser();
  if (!me?.isAdmin) return denied;
  const v = validateSettings({ commissionPercent, holdDays });
  if (!v.ok) return v;
  await saveSettings(prisma, v.values, me.id);
  await audit(me, "payout.settings", null, `commission ${v.values.commissionPercent}%, held ${v.values.holdDays} days`);
  refresh();
  return { ok: true, message: `Saved: ${v.values.commissionPercent}% commission, earnings held ${v.values.holdDays} day${v.values.holdDays === 1 ? "" : "s"}. This applies to payouts prepared from now on.` };
}

/** Prepares payouts for everything that is payable now: for one host, or for every host (hostId = null). */
export async function preparePayouts(hostId: string | null): Promise<PayoutResult> {
  const me = await currentBookingUser();
  if (!me?.isAdmin) return denied;
  if (!rateLimit(`payout-prepare:${me.id}`, 30, 60 * 60 * 1000)) return { ok: false, error: "That was a lot of requests — please wait a few minutes." };
  const r = await createPayouts(prisma, { hostId: hostId ?? undefined, now: new Date(), actorId: me.id });
  for (const c of r.created) await audit(me, "payout.prepare", null, `${kes(c.amount)} for ${c.hostName} (${c.bookingCount} booking${c.bookingCount === 1 ? "" : "s"})`);
  refresh();
  const parts: string[] = [];
  if (r.created.length) parts.push(`Prepared ${r.created.length} payout${r.created.length === 1 ? "" : "s"} (${kes(r.created.reduce((n, c) => n + c.amount, 0))} in all).`);
  if (r.skipped.length) parts.push(`Skipped: ${r.skipped.map((s) => `${s.hostName} — ${s.reason}`).join("; ")}.`);
  if (!r.created.length && !r.skipped.length) return { ok: true, message: "Nothing is payable right now." };
  return { ok: true, message: parts.join(" ") };
}

/** Records that a prepared payout was sent (with its M-Pesa receipt), or that it wasn't (with a reason), which releases its bookings. */
export async function recordPayoutAction(id: string, outcome: "SENT" | "CANCEL", reference: string, note: string): Promise<PayoutResult> {
  const me = await currentBookingUser();
  if (!me?.isAdmin) return denied;
  if (outcome !== "SENT" && outcome !== "CANCEL") return { ok: false, error: "Choose whether it was sent or cancelled." };
  const r = await recordPayout(prisma, id, { outcome, reference, note, actorId: me.id, now: new Date() });
  if (!r.ok) return r;
  const host = await prisma.user.findUnique({ where: { id: r.payout.hostId }, select: { id: true, name: true, email: true } });
  await audit(me, outcome === "SENT" ? "payout.sent" : "payout.cancel", host, `${kes(r.payout.amount)} to ${maskPhone(r.payout.destination)}${outcome === "SENT" ? ` (receipt ${r.payout.reference})` : ` — ${note.trim().slice(0, 120)}`}`);
  if (outcome === "SENT" && host) await notifyPayoutSent({ to: host.email, hostName: host.name, amount: r.payout.amount, bookingCount: r.payout.bookingCount, destination: r.payout.destination, reference: r.payout.reference ?? "" });
  refresh();
  return { ok: true, message: outcome === "SENT" ? "Marked as sent. The host has been emailed." : "Cancelled. Its bookings are free to go into the next payout." };
}
