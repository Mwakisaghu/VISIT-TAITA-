"use server";

import { revalidatePath } from "next/cache";
import { endBooking } from "@/lib/booking-ops";
import { currentBookingUser } from "@/lib/booking-auth";
import { notifyBooking } from "@/lib/booking-emails";
import { prisma } from "@/lib/prisma";

export type AdminBookingResult = { ok: true; message?: string } | { ok: false; error: string };
const no = (error: string): AdminBookingResult => ({ ok: false, error });
const admin = async () => { const u = await currentBookingUser(); return u?.isAdmin ? u : null; };
const refresh = () => { revalidatePath("/admin/bookings"); revalidatePath("/admin/bookings/refunds"); revalidatePath("/partner/bookings"); revalidatePath("/account/bookings"); };

/** An admin cancelling a booking. `fullRefund` overrides the policy ("extenuating circumstances": illness, a death, a disaster). */
export async function adminCancelBooking(bookingId: string, reason: string, fullRefund: boolean): Promise<AdminBookingResult> {
  if (!(await admin())) return no("Admin access required.");
  const why = typeof reason === "string" ? reason.trim().replace(/\s+/g, " ") : "";
  if (why.length < 3 || why.length > 200) return no("Give a short reason (3–200 characters).");
  const r = await prisma.$transaction((tx) => endBooking(tx, String(bookingId), { by: "ADMIN", reason: why, now: new Date(), fullRefund: !!fullRefund }));
  if (!r.ok) return no(r.error);
  await notifyBooking(String(bookingId), { kind: "cancelledByUs", refund: r.quote.refund });
  refresh();
  return { ok: true, message: r.quote.refund > 0 ? `Cancelled. KES ${r.quote.refund.toLocaleString("en-KE")} to refund.` : "Cancelled. Nothing to refund." };
}

/** Record the outcome of a refund. M-Pesa refunds are sent by hand, so a person marks each one sent, with the M-Pesa receipt. */
export async function processRefund(refundId: string, outcome: "SENT" | "FAILED", reference: string, note: string): Promise<AdminBookingResult> {
  const user = await admin();
  if (!user) return no("Admin access required.");
  if (outcome !== "SENT" && outcome !== "FAILED") return no("Choose sent or failed.");
  const ref = typeof reference === "string" ? reference.trim() : "";
  const n = typeof note === "string" ? note.trim().slice(0, 300) : "";
  if (outcome === "SENT" && !/^[A-Za-z0-9 -]{4,40}$/.test(ref)) return no("Enter the M-Pesa receipt (or card refund reference) — 4 to 40 letters and numbers.");
  if (outcome === "FAILED" && n.length < 3) return no("Say what went wrong, so it can be put right.");
  // Only a refund that is still waiting (or failed earlier) can be processed — and only once.
  const done = await prisma.bookingRefund.updateMany({ where: { id: String(refundId), status: { in: ["PENDING", "FAILED"] } }, data: { status: outcome, reference: ref || null, note: n || null, processedAt: new Date(), processedById: user.id } });
  if (done.count !== 1) return no("This refund has already been recorded.");
  if (outcome === "SENT") {
    const r = await prisma.bookingRefund.findUnique({ where: { id: String(refundId) }, select: { bookingId: true, amount: true, reference: true } });
    if (r) await notifyBooking(r.bookingId, { kind: "refundSent", amount: r.amount, reference: r.reference });
  }
  refresh();
  return { ok: true, message: outcome === "SENT" ? "Marked as sent. The guest has been emailed." : "Marked as failed." };
}
