"use server";

import { revalidatePath } from "next/cache";
import { currentBookingUser, type BookingUser } from "@/lib/booking-auth";
import { notifyCancelled, notifyConfirmed, notifyIssued, notifyReserved } from "@/lib/ticket-emails";
import { admit, cancelTickets, claimPayment, confirmPayment, reserveTickets, saveSettings, type Admission } from "@/lib/ticket-ops";
import { parseEatLocal } from "@/lib/booking";
import { validateTicketSettings } from "@/lib/ticket";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export type TicketResult = { ok: true; message: string; id?: string } | { ok: false; error: string };
const signIn = { ok: false as const, error: "Please sign in to get tickets." };
const refresh = (eventId?: string) => { revalidatePath("/account/tickets"); revalidatePath("/events"); if (eventId) { revalidatePath(`/admin/events/${eventId}/tickets`); revalidatePath(`/partner/events/${eventId}/tickets`); } };
const audit = (actor: BookingUser, action: string, detail: string) => prisma.adminAuditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action, detail: detail.slice(0, 300) } }).catch(() => null);

/** The people who run an event's tickets: admins and super admins, and the partner named as its organiser. Read fresh from the database. */
async function staffFor(eventId: string): Promise<{ user: BookingUser; event: { id: string; name: string; eventDate: Date; organiserId: string | null; ticketPrice: number } } | null> {
  const user = await currentBookingUser(); if (!user) return null;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, name: true, eventDate: true, organiserId: true, ticketPrice: true } });
  if (!event) return null;
  if (user.isAdmin || (user.role === "PARTNER" && event.organiserId === user.id)) return { user, event };
  return null;
}
const noAccess = { ok: false as const, error: "You don't have access to this event's tickets." };

// ------------------------------------------------------------------------------------------------------------- guests
export async function reserveTicketsAction(eventId: string, quantity: number, name: string, phone: string): Promise<TicketResult> {
  const me = await currentBookingUser(); if (!me) return signIn;
  if (!me.emailVerifiedAt) return { ok: false, error: "Please verify your email address first — we send your tickets there. You can resend the link from your account." };
  if (!rateLimit(`tickets:${me.id}`, 10, 60 * 60 * 1000)) return { ok: false, error: "You've made a lot of requests — please try again in an hour." };
  const r = await reserveTickets(prisma, { eventId, userId: me.id, name, phone, quantity, now: new Date() });
  if (!r.ok) return r;
  const ev = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  const base = { to: me.email, holder: name, eventName: ev.name, eventDate: ev.eventDate, groupId: r.groupId, numbers: r.tickets.map((t) => t.number) };
  if (r.mode === "FREE") await notifyIssued(base);
  else await notifyReserved({ ...base, event: ev, quantity: r.tickets.length, expiresAt: (await prisma.ticket.findFirst({ where: { groupId: r.groupId }, select: { expiresAt: true } }))?.expiresAt ?? null });
  refresh(eventId);
  return { ok: true, id: r.groupId, message: r.mode === "FREE" ? "Your tickets are ready." : "Your tickets are reserved — pay as shown to confirm them." };
}

/** The guest tells us which M-Pesa code they paid with. */
export async function claimPaymentAction(groupId: string, code: string): Promise<TicketResult> {
  const me = await currentBookingUser(); if (!me) return signIn;
  if (!rateLimit(`ticket-claim:${me.id}`, 20, 60 * 60 * 1000)) return { ok: false, error: "That was a lot of attempts — please try again later." };
  const r = await claimPayment(prisma, { groupId, userId: me.id, code, now: new Date() });
  if (!r.ok) return r;
  refresh();
  return { ok: true, message: "Thank you — the organiser will match your payment and confirm your tickets." };
}

/** A guest cancels their own tickets: free tickets, and reservations not yet paid. Paid tickets are refunded by the organiser, not here. */
export async function cancelMyTicketsAction(groupId: string): Promise<TicketResult> {
  const me = await currentBookingUser(); if (!me) return signIn;
  const mine = await prisma.ticket.findMany({ where: { groupId, userId: me.id }, select: { id: true, eventId: true, status: true, price: true, event: { select: { eventDate: true } } } });
  if (mine.length === 0) return { ok: false, error: "Tickets not found." };
  if (mine[0].event.eventDate.getTime() <= Date.now()) return { ok: false, error: "This event has started, so the tickets can't be cancelled." };
  const allowed = mine.filter((t) => t.status === "PENDING_PAYMENT" || (t.status === "VALID" && t.price === 0));
  const paidValid = mine.filter((t) => t.status === "VALID" && t.price > 0).length;
  if (allowed.length === 0) return { ok: false, error: paidValid ? "Paid tickets can't be cancelled here — please contact the organiser about a refund." : "There's nothing to cancel on these tickets." };
  let n = 0;
  for (const t of allowed) { const r = await cancelTickets(prisma, { eventId: t.eventId, ticketId: t.id, userId: me.id, by: "GUEST", now: new Date() }); if (r.ok) n += r.count; }
  refresh(mine[0].eventId);
  return { ok: true, message: `Cancelled ${n} ticket${n === 1 ? "" : "s"}.${paidValid ? " Your paid tickets are still valid — contact the organiser about a refund." : ""}` };
}

// ------------------------------------------------------------------------------------------------------------- admins (money settings)
export async function saveTicketSettingsAction(eventId: string, form: Record<string, string>): Promise<TicketResult> {
  const me = await currentBookingUser();
  if (!me?.isAdmin) return { ok: false, error: "Admin access required." };
  const ev = await prisma.event.findUnique({ where: { id: eventId }, select: { eventDate: true } });
  if (!ev) return { ok: false, error: "Event not found." };
  // The close time is typed as Nairobi time (date + time boxes), not the server's clock.
  const closeAt = form.closeDate ? parseEatLocal(form.closeDate, form.closeTime || "00:00") : null;
  if (form.closeDate && !closeAt) return { ok: false, error: "That sales-close date or time isn't valid." };
  const v = validateTicketSettings({ ...form, ticketsCloseAt: closeAt }, ev.eventDate);
  if (!v.ok) return v;
  const r = await saveSettings(prisma, eventId, v.values, form.organiserEmail ?? "");
  if (!r.ok) return r;
  await audit(me, "event.tickets", `${eventId}: ${v.values.ticketing}${v.values.ticketing === "PAID" ? `, KES ${v.values.ticketPrice}, ${v.values.payMethod}` : ""}${v.values.ticketCapacity ? `, ${v.values.ticketCapacity} tickets` : ""}`);
  refresh(eventId); revalidatePath(`/events`);
  return { ok: true, message: v.values.ticketing === "OFF" ? "Saved. This event has no tickets." : `Saved. Ticket numbers will read ${r.prefix}-0001, ${r.prefix}-0002 …` };
}

// ------------------------------------------------------------------------------------------------------------- organiser or admin
export async function confirmPaymentAction(eventId: string, groupId: string, reference: string): Promise<TicketResult> {
  const s = await staffFor(eventId); if (!s) return noAccess;
  const r = await confirmPayment(prisma, { eventId, groupId, reference, actorId: s.user.id, now: new Date() });
  if (!r.ok) return r;
  await audit(s.user, "ticket.confirm", `${r.eventName}: ${r.numbers.join(", ")} confirmed with ${String(reference).trim().toUpperCase()}`);
  const owner = r.userId ? await prisma.user.findUnique({ where: { id: r.userId }, select: { email: true } }) : null;
  if (owner) await notifyConfirmed({ to: owner.email, holder: r.holder, eventName: r.eventName, eventDate: s.event.eventDate, groupId, numbers: r.numbers });
  refresh(eventId);
  return { ok: true, message: r.revived ? `Confirmed — this reservation had expired, and its seats were still free, so it has been revived.` : "Payment confirmed. The guest has been emailed their valid tickets." };
}

export async function cancelTicketsAction(eventId: string, groupId: string, reason: string): Promise<TicketResult> {
  const s = await staffFor(eventId); if (!s) return noAccess;
  const why = (reason ?? "").replace(/\s+/g, " ").trim();
  if (why.length < 3) return { ok: false, error: "Give a short reason (a few words) — the guest will be told." };
  const tickets = await prisma.ticket.findMany({ where: { eventId, groupId }, select: { number: true, userId: true, holderName: true, status: true, price: true } });
  const r = await cancelTickets(prisma, { eventId, groupId, by: s.user.isAdmin ? "ADMIN" : "ORGANISER", reason: why, now: new Date() });
  if (!r.ok) return r;
  await audit(s.user, "ticket.cancel", `${tickets.map((t) => t.number).join(", ")} cancelled — ${why.slice(0, 120)}`);
  const owner = tickets[0]?.userId ? await prisma.user.findUnique({ where: { id: tickets[0].userId }, select: { email: true } }) : null;
  if (owner) await notifyCancelled({ to: owner.email, holder: tickets[0].holderName, eventName: s.event.name, eventDate: s.event.eventDate, groupId, numbers: tickets.map((t) => t.number), by: s.user.isAdmin ? "ADMIN" : "ORGANISER", reason: why, wasPaid: tickets.some((t) => t.status === "VALID" && t.price > 0) });
  refresh(eventId);
  return { ok: true, message: `Cancelled ${r.count} ticket${r.count === 1 ? "" : "s"}. The guest has been emailed.` };
}

export type DoorResult = { ok: true; admission: Admission } | { ok: false; error: string };
/** The door: admit one person by QR token or by ticket number. */
export async function admitAction(eventId: string, query: { secret?: string; number?: string }): Promise<DoorResult> {
  const s = await staffFor(eventId); if (!s) return { ok: false, error: "You don't have access to this event's door." };
  if (!rateLimit(`door:${s.user.id}`, 600, 60 * 60 * 1000)) return { ok: false, error: "Too many scans — please wait a moment." };
  const admission = await admit(prisma, { eventId, secret: query.secret, number: query.number, actorId: s.user.id, now: new Date() });
  if (admission.result === "ADMITTED") refresh(eventId);
  return { ok: true, admission };
}
