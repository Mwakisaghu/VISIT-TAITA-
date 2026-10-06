"use server";

import { revalidatePath } from "next/cache";
import { cancellationQuote, nextPaymentDue, type CancellationPolicyKey, type PaymentModeKey } from "@/lib/booking";
import { createBooking, endBooking } from "@/lib/booking-ops";
import { currentBookingUser } from "@/lib/booking-auth";
import { notifyBooking } from "@/lib/booking-emails";
import { isSafaricomNumber, startCardPayment, startMpesaPayment, syncBookingPayments } from "@/lib/booking-payments";
import { normalizeMpesaPhone } from "@/lib/mpesa";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const HOUR = 60 * 60 * 1000;
export type BookingActionResult = { ok: true; id?: string; message?: string; url?: string } | { ok: false; error: string };

const signIn = { ok: false as const, error: "Please sign in to book." };

/** A guest phone number: a Safaricom number is stored as 2547…; anything else just has to look like a phone number. */
export function cleanPhone(raw: unknown): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  const n = normalizeMpesaPhone(s);
  if (isSafaricomNumber(n)) return n;
  const digits = s.replace(/[\s()-]/g, "");
  return /^\+?\d{9,15}$/.test(digits) ? digits : null;
}

export async function createBookingAction(formData: FormData): Promise<BookingActionResult> {
  const user = await currentBookingUser();
  if (!user) return signIn;
  if (!user.emailVerifiedAt) return { ok: false, error: "Please verify your email address first — we email the booking details there. You can resend the link from your account page." };
  if (!rateLimit(`book:${user.id}`, 10, HOUR)) return { ok: false, error: "You've tried to book a lot of times in the last hour — please try again later." };

  const phone = cleanPhone(formData.get("phone"));
  if (!phone) return { ok: false, error: "Enter a phone number the host can reach you on, like 0712 345 678." };
  if (formData.get("accept") !== "on") return { ok: false, error: "Please tick the box to accept the booking terms and the cancellation policy." };
  const note = typeof formData.get("note") === "string" ? (formData.get("note") as string).trim().slice(0, 500) : "";

  const now = new Date();
  const result = await prisma.$transaction((tx) => createBooking(tx, { experienceId: String(formData.get("experienceId") ?? ""), sessionId: String(formData.get("sessionId") ?? ""), userId: user.id, guestName: user.name, guestEmail: user.email, guestPhone: phone, guests: formData.get("guests"), note: note || null, now }));
  if (!result.ok) return { ok: false, error: result.error };

  if (result.booking.status === "REQUESTED") await notifyBooking(result.booking.id, { kind: "requestSent" });
  revalidatePath("/account/bookings");
  return { ok: true, id: result.booking.id, message: result.booking.collapsedToFull ? "This date is close, so the full price is due now instead of a deposit." : undefined };
}

export async function payWithMpesa(bookingId: string, phone: string): Promise<BookingActionResult> {
  const user = await currentBookingUser();
  if (!user) return signIn;
  if (!rateLimit(`pay:${bookingId}`, 8, HOUR)) return { ok: false, error: "Too many payment attempts. Please wait a while and try again." };
  const r = await startMpesaPayment(String(bookingId), user.id, phone);
  if (!r.ok) return r;
  revalidatePath(`/bookings/${bookingId}`);
  return { ok: true, message: "Check your phone and enter your M-Pesa PIN." };
}

export async function payWithCard(bookingId: string): Promise<BookingActionResult> {
  const user = await currentBookingUser();
  if (!user) return signIn;
  if (!rateLimit(`pay:${bookingId}`, 8, HOUR)) return { ok: false, error: "Too many payment attempts. Please wait a while and try again." };
  const r = await startCardPayment(String(bookingId), user.id);
  return r.ok ? { ok: true, url: r.url } : r;
}

/** Polled by the booking page while a payment is in progress. Asks the provider, so a missed callback can't leave anyone waiting. */
export async function getBookingStatus(bookingId: string): Promise<{ ok: true; status: string; paidAmount: number; waiting: boolean } | { ok: false; error: string }> {
  const user = await currentBookingUser();
  if (!user) return { ok: false, error: "Please sign in." };
  const own = await prisma.booking.findFirst({ where: { id: String(bookingId), userId: user.id }, select: { id: true } });
  if (!own) return { ok: false, error: "Booking not found." };
  await syncBookingPayments(own.id);
  const b = await prisma.booking.findUniqueOrThrow({ where: { id: own.id }, select: { status: true, paidAmount: true, payments: { where: { status: "PENDING" }, select: { id: true }, take: 1 } } });
  return { ok: true, status: b.status, paidAmount: b.paidAmount, waiting: b.payments.length > 0 };
}

/** What cancelling would give back, right now. (No side effects: the page shows it before the guest confirms.) */
export async function previewCancellation(bookingId: string) {
  const user = await currentBookingUser();
  if (!user) return signIn;
  const b = await prisma.booking.findFirst({ where: { id: String(bookingId), userId: user.id }, include: { session: { select: { startsAt: true } } } });
  if (!b) return { ok: false as const, error: "Booking not found." };
  if (!["REQUESTED", "AWAITING_PAYMENT", "CONFIRMED"].includes(b.status)) return { ok: false as const, error: "This booking has already ended." };
  const q = cancellationQuote({ by: "GUEST", policy: b.cancellationPolicy as CancellationPolicyKey, startsAt: b.session.startsAt, bookedAt: b.createdAt, now: new Date(), totalAmount: b.totalAmount, paidAmount: b.paidAmount });
  return { ok: true as const, refund: q.refund, retained: q.retained, percent: q.percent, basis: q.basis, paid: b.paidAmount };
}

export async function cancelMyBooking(bookingId: string): Promise<BookingActionResult & { refund?: number }> {
  const user = await currentBookingUser();
  if (!user) return signIn;
  const own = await prisma.booking.findFirst({ where: { id: String(bookingId), userId: user.id }, select: { id: true, session: { select: { startsAt: true } } } });
  if (!own) return { ok: false, error: "Booking not found." };
  const now = new Date();
  if (own.session.startsAt <= now) return { ok: false, error: "This experience has already started, so it can't be cancelled online. Please contact the host." };
  const r = await prisma.$transaction((tx) => endBooking(tx, own.id, { by: "GUEST", reason: "Cancelled by the guest.", now }));
  if (!r.ok) return { ok: false, error: r.error };
  const basis = r.quote.basis === "cooling_off" ? "within 24 hours of booking" : `${r.quote.percent}% under the cancellation policy`;
  await notifyBooking(own.id, { kind: "cancelledByGuest", refund: r.quote.refund, basis });
  revalidatePath(`/bookings/${own.id}`); revalidatePath("/account/bookings"); revalidatePath("/partner/bookings");
  return { ok: true, id: own.id, refund: r.quote.refund, message: r.quote.refund > 0 ? `Cancelled. A refund of KES ${r.quote.refund.toLocaleString("en-KE")} will be sent to you.` : "Cancelled." };
}
