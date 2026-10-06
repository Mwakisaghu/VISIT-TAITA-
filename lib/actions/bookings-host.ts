"use server";

import { revalidatePath } from "next/cache";
import { isPaymentMode, isPolicy, expandWeekly, parseEatLocal, HOUR, DAY } from "@/lib/booking";
import { acceptRequest, cancelSession, endBooking } from "@/lib/booking-ops";
import { currentBookingUser, type BookingUser } from "@/lib/booking-auth";
import { notifyBooking } from "@/lib/booking-emails";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export type HostResult = { ok: true; message?: string } | { ok: false; error: string };
const no = (error: string): HostResult => ({ ok: false, error });
const int = (v: FormDataEntryValue | null) => (typeof v === "string" && /^-?\d{1,6}$/.test(v.trim()) ? Number(v.trim()) : NaN);

async function hostUser(): Promise<BookingUser | null> {
  const u = await currentBookingUser();
  return u && (u.isAdmin || u.role === "PARTNER") ? u : null;
}
/** The experience, only if this person owns it (or is an admin). A host can never touch another host's. */
async function ownedExperience(user: BookingUser, id: string) {
  const e = await prisma.experience.findUnique({ where: { id: String(id) }, select: { id: true, slug: true, ownerId: true, priceFrom: true } });
  return e && (user.isAdmin || e.ownerId === user.id) ? e : null;
}
async function ownedBooking(user: BookingUser, id: string) {
  const b = await prisma.booking.findUnique({ where: { id: String(id) }, include: { experience: { select: { ownerId: true, slug: true } }, session: { select: { startsAt: true } } } });
  return b && (user.isAdmin || b.experience.ownerId === user.id) ? b : null;
}
const refreshAll = (slug?: string) => { revalidatePath("/partner/bookings"); revalidatePath("/account/bookings"); revalidatePath("/admin/bookings"); if (slug) revalidatePath(`/experiences/listing/${slug}`); };

export async function saveBookingSettings(experienceId: string, formData: FormData): Promise<HostResult> {
  const user = await hostUser(); if (!user) return no("Partner access required.");
  const e = await ownedExperience(user, experienceId); if (!e) return no("Experience not found.");

  const enabled = formData.get("bookingEnabled") === "on";
  const mode = formData.get("paymentMode"), policy = formData.get("cancellationPolicy");
  const deposit = int(formData.get("depositPercent")), balanceDays = int(formData.get("balanceDueDays")), cutoff = int(formData.get("bookingCutoffHours")), maxGuests = int(formData.get("maxGuestsPerBooking"));
  if (!isPaymentMode(mode)) return no("Choose how guests pay.");
  if (!isPolicy(policy)) return no("Choose a cancellation policy.");
  if (!(deposit >= 10 && deposit <= 90)) return no("The deposit must be between 10% and 90%.");
  if (!(balanceDays >= 1 && balanceDays <= 30)) return no("The balance must be due between 1 and 30 days before the start.");
  if (!(cutoff >= 2 && cutoff <= 168)) return no("Bookings can close between 2 hours and 7 days before the start.");
  if (mode === "AFTER_CONFIRMATION" && cutoff < 12) return no("When you approve requests yourself, bookings must close at least 12 hours before the start so you have time to answer.");
  if (!(maxGuests >= 1 && maxGuests <= 50)) return no("Guests per booking must be between 1 and 50.");
  if (enabled && (!e.priceFrom || e.priceFrom < 1)) return no("Set a price per person on the experience first — guests can't book without one.");

  await prisma.experience.update({ where: { id: e.id }, data: { bookingEnabled: enabled, paymentMode: mode, depositPercent: deposit, balanceDueDays: balanceDays, cancellationPolicy: policy, bookingCutoffHours: cutoff, maxGuestsPerBooking: maxGuests } });
  refreshAll(e.slug); revalidatePath(`/partner/experiences/${e.id}/availability`);
  return { ok: true, message: "Saved. These settings apply to new bookings; bookings already made keep the terms they were made under." };
}

export async function addSessions(experienceId: string, formData: FormData): Promise<HostResult> {
  const user = await hostUser(); if (!user) return no("Partner access required.");
  const e = await ownedExperience(user, experienceId); if (!e) return no("Experience not found.");
  if (!rateLimit(`sessions:${user.id}`, 40, HOUR)) return no("You've added a lot of dates in the last hour — please try again later.");

  const first = parseEatLocal(formData.get("date"), formData.get("time"));
  if (!first) return no("Choose a real date and time (East Africa Time).");
  const capacity = int(formData.get("capacity")), weeks = int(formData.get("repeatWeeks"));
  if (!(capacity >= 1 && capacity <= 500)) return no("Capacity must be between 1 and 500 guests.");
  if (!(weeks >= 1 && weeks <= 26)) return no("Repeat for between 1 and 26 weeks.");
  const note = typeof formData.get("note") === "string" ? (formData.get("note") as string).trim().slice(0, 200) : "";

  const now = Date.now();
  const dates = expandWeekly(first, weeks);
  if (dates.some((d) => d.getTime() < now + 2 * HOUR)) return no("Dates must be at least 2 hours from now.");
  if (dates.some((d) => d.getTime() > now + 550 * DAY)) return no("Dates can be at most 18 months ahead.");

  const made = await prisma.experienceSession.createMany({ data: dates.map((startsAt) => ({ experienceId: e.id, startsAt, capacity, note: note || null })), skipDuplicates: true });
  if (made.count === 0) return no("Those dates already exist.");
  refreshAll(e.slug); revalidatePath(`/partner/experiences/${e.id}/availability`);
  return { ok: true, message: made.count === dates.length ? `Added ${made.count} date${made.count === 1 ? "" : "s"}.` : `Added ${made.count} of ${dates.length} — the rest already existed.` };
}

export async function updateSession(sessionId: string, formData: FormData): Promise<HostResult> {
  const user = await hostUser(); if (!user) return no("Partner access required.");
  const s = await prisma.experienceSession.findUnique({ where: { id: String(sessionId) }, select: { id: true, status: true, experience: { select: { id: true, slug: true, ownerId: true } } } });
  if (!s || !(user.isAdmin || s.experience.ownerId === user.id)) return no("Date not found.");
  if (s.status === "CANCELLED") return no("A cancelled date can't be changed.");
  const capacity = int(formData.get("capacity"));
  if (!(capacity >= 1 && capacity <= 500)) return no("Capacity must be between 1 and 500 guests.");
  const status = formData.get("status") === "CLOSED" ? "CLOSED" : "OPEN";
  const note = typeof formData.get("note") === "string" ? (formData.get("note") as string).trim().slice(0, 200) : "";
  // Capacity can never drop below the seats already sold: the update only happens if that is still true at this instant.
  const done = await prisma.experienceSession.updateMany({ where: { id: s.id, seatsTaken: { lte: capacity } }, data: { capacity, status, note: note || null } });
  if (done.count !== 1) return no("There are already more guests booked than that. Cancel some bookings, or choose a higher capacity.");
  refreshAll(s.experience.slug); revalidatePath(`/partner/experiences/${s.experience.id}/availability`);
  return { ok: true, message: "Saved." };
}

export async function cancelSessionAction(sessionId: string, reason: string): Promise<HostResult> {
  const user = await hostUser(); if (!user) return no("Partner access required.");
  const s = await prisma.experienceSession.findUnique({ where: { id: String(sessionId) }, select: { id: true, experience: { select: { id: true, slug: true, ownerId: true } } } });
  if (!s || !(user.isAdmin || s.experience.ownerId === user.id)) return no("Date not found.");
  const why = typeof reason === "string" ? reason.trim().replace(/\s+/g, " ") : "";
  if (why.length < 3 || why.length > 200) return no("Give a short reason (3–200 characters) — your guests will be told.");
  const r = await prisma.$transaction((tx) => cancelSession(tx, s.id, user.isAdmin && s.experience.ownerId !== user.id ? "ADMIN" : "HOST", why, new Date()));
  if (!r.ok) return no(r.error);
  for (const e of r.ended) await notifyBooking(e.bookingId, { kind: "sessionCancelled", refund: e.refund });
  refreshAll(s.experience.slug); revalidatePath(`/partner/experiences/${s.experience.id}/availability`);
  return { ok: true, message: r.ended.length ? `Date cancelled. ${r.ended.length} guest${r.ended.length === 1 ? " was" : "s were"} told and will be refunded in full.` : "Date cancelled." };
}

export async function decideBooking(bookingId: string, decision: "accept" | "decline", reason?: string): Promise<HostResult> {
  const user = await hostUser(); if (!user) return no("Partner access required.");
  const b = await ownedBooking(user, bookingId); if (!b) return no("Booking not found.");
  const now = new Date();
  if (decision === "accept") {
    const r = await prisma.$transaction((tx) => acceptRequest(tx, b.id, now));
    if (!r.ok) return no(r.error);
    await notifyBooking(b.id, { kind: "accepted" });
    refreshAll(b.experience.slug);
    return { ok: true, message: "Accepted. The guest has been emailed a link to pay." };
  }
  const why = typeof reason === "string" ? reason.trim().replace(/\s+/g, " ").slice(0, 200) : "";
  if (b.status !== "REQUESTED") return no("This request is no longer waiting for an answer.");
  const r = await prisma.$transaction((tx) => endBooking(tx, b.id, { by: "HOST", reason: why || "The host couldn't take this booking.", now, finalStatus: "DECLINED" }));
  if (!r.ok) return no(r.error);
  await notifyBooking(b.id, { kind: "declined" });
  refreshAll(b.experience.slug);
  return { ok: true, message: "Declined. The guest has been told and their seats are free." };
}

/** A host cancelling one confirmed booking: always a full refund to the guest. */
export async function hostCancelBooking(bookingId: string, reason: string): Promise<HostResult> {
  const user = await hostUser(); if (!user) return no("Partner access required.");
  const b = await ownedBooking(user, bookingId); if (!b) return no("Booking not found.");
  const why = typeof reason === "string" ? reason.trim().replace(/\s+/g, " ") : "";
  if (why.length < 3 || why.length > 200) return no("Give a short reason (3–200 characters) — the guest will be told.");
  const r = await prisma.$transaction((tx) => endBooking(tx, b.id, { by: "HOST", reason: why, now: new Date(), fullRefund: true }));
  if (!r.ok) return no(r.error);
  await notifyBooking(b.id, { kind: "cancelledByHost", refund: r.quote.refund });
  refreshAll(b.experience.slug);
  return { ok: true, message: r.quote.refund > 0 ? `Cancelled. The guest will be refunded KES ${r.quote.refund.toLocaleString("en-KE")} in full.` : "Cancelled." };
}

/** After the start time: record that the guest came, or didn't (a no-show is not refunded). */
export async function markAttendance(bookingId: string, outcome: "COMPLETED" | "NO_SHOW"): Promise<HostResult> {
  const user = await hostUser(); if (!user) return no("Partner access required.");
  const b = await ownedBooking(user, bookingId); if (!b) return no("Booking not found.");
  if (outcome !== "COMPLETED" && outcome !== "NO_SHOW") return no("Choose completed or no-show.");
  if (b.session.startsAt > new Date()) return no("You can record this after the experience has started.");
  const done = await prisma.booking.updateMany({ where: { id: b.id, status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] } }, data: { status: outcome, completedAt: new Date() } });
  if (done.count !== 1) return no("This booking can't be marked.");
  refreshAll(b.experience.slug);
  return { ok: true, message: outcome === "NO_SHOW" ? "Marked as a no-show." : "Marked as completed." };
}
