// Booking emails: plain-text service messages (no marketing, no tracking). The text builders are pure; the senders are best-effort
// (a failed email never undoes a booking — the email layer keeps its own retry queue).
import { checkinBaseUrl } from "@/lib/checkin-url";
import { sendEmail } from "@/lib/email";
import { formatEat, formatEatDate, policyLabel, policyLines, type CancellationPolicyKey } from "@/lib/booking";
import { prisma } from "@/lib/prisma";

const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
const first = (name: string) => name.trim().split(/\s+/)[0] || "there";
const sign = ["", "Visit Taita"];

export type MailBooking = {
  id: string; reference: string; guestName: string; guestEmail: string; guestPhone: string; guests: number; note: string | null;
  totalAmount: number; paidAmount: number; depositAmount: number | null; balanceDueAt: Date | null; expiresAt: Date | null; cancellationPolicy: CancellationPolicyKey;
  cancelReason: string | null; startsAt: Date; experienceName: string; hostName: string | null; hostEmail: string | null;
};

const lines = (...l: (string | null | false | undefined)[]) => l.filter((x) => x !== null && x !== false && x !== undefined).join("\n");
const what = (b: MailBooking) => `${b.experienceName} — ${formatEat(b.startsAt)} — ${b.guests} guest${b.guests === 1 ? "" : "s"} (booking ${b.reference})`;
const link = (base: string, b: MailBooking) => `${base}/bookings/${b.id}`;

export const T = {
  requestSent: (b: MailBooking, base: string) => lines(`Hi ${first(b.guestName)},`, "", "Your request has been sent to the host:", what(b), "", "The host replies within 48 hours. If they accept, we'll email you a link to pay — nothing is charged before that. If they can't, your place is released and you pay nothing.", link(base, b), ...sign),
  hostNewRequest: (b: MailBooking, base: string) => lines(`Hi ${first(b.hostName ?? "there")},`, "", "A guest has asked to book:", what(b), `Guest: ${b.guestName} · ${b.guestPhone}`, b.note ? `Their note: ${b.note}` : null, "", `Please accept or decline${b.expiresAt ? ` by ${formatEat(b.expiresAt)}` : " within 48 hours"} — their seats are held until then, and the request lapses if nobody answers.`, `${base}/partner/bookings`, ...sign),
  accepted: (b: MailBooking, base: string) => lines(`Hi ${first(b.guestName)},`, "", "Good news — the host accepted your request:", what(b), "", `To confirm your place, pay ${kes(b.totalAmount)}${b.expiresAt ? ` by ${formatEat(b.expiresAt)}` : ""}. If it isn't paid in time your place is released.`, link(base, b), ...sign),
  declined: (b: MailBooking) => lines(`Hi ${first(b.guestName)},`, "", "Sorry — the host couldn't take your booking:", what(b), b.cancelReason ? `Reason: ${b.cancelReason}` : null, "", "You haven't been charged anything. You're welcome to look for another date or experience on Visit Taita.", ...sign),
  confirmed: (b: MailBooking, base: string, receipt?: string | null) => lines(`Hi ${first(b.guestName)},`, "", "Your booking is confirmed. 🎉", what(b), `Paid: ${kes(b.paidAmount)} of ${kes(b.totalAmount)}${receipt ? ` (M-Pesa receipt ${receipt})` : ""}`, b.paidAmount < b.totalAmount && b.balanceDueAt ? `Balance of ${kes(b.totalAmount - b.paidAmount)} is due by ${formatEat(b.balanceDueAt)}. If it isn't paid by then your booking is cancelled and the deposit is kept.` : null, "", `Cancellation policy — ${policyLabel(b.cancellationPolicy)}:`, ...policyLines(b.cancellationPolicy), "", `View or manage your booking: ${link(base, b)}`, ...sign),
  hostConfirmed: (b: MailBooking, base: string) => lines(`Hi ${first(b.hostName ?? "there")},`, "", "A booking is confirmed:", what(b), `Guest: ${b.guestName} · ${b.guestPhone}`, b.note ? `Their note: ${b.note}` : null, b.paidAmount < b.totalAmount ? `Paid so far ${kes(b.paidAmount)} of ${kes(b.totalAmount)}; the balance is due ${b.balanceDueAt ? formatEat(b.balanceDueAt) : "before the start"}.` : `Fully paid (${kes(b.totalAmount)}).`, "", `${base}/partner/bookings`, ...sign),
  balancePaid: (b: MailBooking, base: string) => lines(`Hi ${first(b.guestName)},`, "", `Thank you — your balance is paid and booking ${b.reference} is paid in full (${kes(b.totalAmount)}).`, what(b), link(base, b), ...sign),
  balanceReminder: (b: MailBooking, base: string) => lines(`Hi ${first(b.guestName)},`, "", `A reminder: the balance of ${kes(b.totalAmount - b.paidAmount)} for your booking is due by ${b.balanceDueAt ? formatEat(b.balanceDueAt) : "soon"}.`, what(b), "If it isn't paid by then your booking is cancelled and your deposit is kept.", `Pay here: ${link(base, b)}`, ...sign),
  cancelledByGuest: (b: MailBooking, refund: number, basis: string) => lines(`Hi ${first(b.guestName)},`, "", "Your booking has been cancelled:", what(b), "", refund > 0 ? `Refund: ${kes(refund)} (${basis}). We send refunds to the number or card you paid with, normally within 3 working days, and we'll email you when it's sent.` : b.paidAmount > 0 ? `Under the ${policyLabel(b.cancellationPolicy)} policy no refund is due (${basis}).` : "Nothing had been paid, so nothing is owed.", ...sign),
  cancelledByHost: (b: MailBooking, refund: number) => lines(`Hi ${first(b.guestName)},`, "", "Sorry — the host has had to cancel:", what(b), b.cancelReason ? `Reason: ${b.cancelReason}` : null, "", refund > 0 ? `You'll get a full refund of ${kes(refund)}, sent to the number or card you paid with, normally within 3 working days.` : "You hadn't paid anything, so nothing is owed.", "", "We're sorry for the disappointment — please look for another date on Visit Taita.", ...sign),
  cancelledByUs: (b: MailBooking, refund: number) => lines(`Hi ${first(b.guestName)},`, "", "We have cancelled your booking:", what(b), b.cancelReason ? `Reason: ${b.cancelReason}` : null, "", refund > 0 ? `A refund of ${kes(refund)} will be sent to the number or card you paid with, normally within 3 working days.` : b.paidAmount > 0 ? "No refund is due under the cancellation policy. If you think that is wrong, please reply to this email." : "You hadn't paid anything, so nothing is owed.", ...sign),
  hostGuestCancelled: (b: MailBooking, base: string) => lines(`Hi ${first(b.hostName ?? "there")},`, "", "A guest has cancelled:", what(b), "", "Their seats are free again.", `${base}/partner/bookings`, ...sign),
  expired: (b: MailBooking, why: "unpaid" | "no_answer") => lines(`Hi ${first(b.guestName)},`, "", why === "unpaid" ? "Your seats were held for you but the payment wasn't completed in time, so the booking has lapsed:" : "The host didn't answer your request in time, so it has lapsed:", what(b), "", "You haven't been charged. If you paid just now and this message crossed with it, don't worry — we'll confirm or refund it automatically.", ...sign),
  balanceNotPaid: (b: MailBooking) => lines(`Hi ${first(b.guestName)},`, "", "The balance for your booking wasn't paid by the due date, so it has been cancelled and your deposit is kept, as agreed when you booked:", what(b), "", "If something went wrong, reply to this email or contact us as soon as you can.", ...sign),
  refundSent: (b: MailBooking, amount: number, reference: string | null) => lines(`Hi ${first(b.guestName)},`, "", `We've sent your refund of ${kes(amount)} for booking ${b.reference}${reference ? ` (reference ${reference})` : ""}.`, "It should reach you shortly. If it hasn't within 3 working days, please contact us.", ...sign),
  lateRefund: (b: MailBooking, amount: number, why: string) => lines(`Hi ${first(b.guestName)},`, "", `We received a payment of ${kes(amount)} for booking ${b.reference} that we can't apply: ${why}`, "A full refund is on its way to the number or card you paid with, normally within 3 working days.", ...sign),
  sessionCancelled: (b: MailBooking, refund: number) => lines(`Hi ${first(b.guestName)},`, "", "Sorry — this date has been cancelled by the host:", what(b), b.cancelReason ? `Reason: ${b.cancelReason}` : null, "", refund > 0 ? `You'll get a full refund of ${kes(refund)}, normally within 3 working days.` : "You hadn't paid anything, so nothing is owed.", "", "You're welcome to book another date on Visit Taita.", ...sign),
};

// ---------------------------------------------------------------------------------------------------------------------------
async function load(bookingId: string): Promise<MailBooking | null> {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { session: { select: { startsAt: true } }, experience: { select: { name: true, contactEmail: true, owner: { select: { name: true, email: true } } } } } });
  if (!b) return null;
  return {
    id: b.id, reference: b.reference, guestName: b.guestName, guestEmail: b.guestEmail, guestPhone: b.guestPhone, guests: b.guests, note: b.note, totalAmount: b.totalAmount, paidAmount: b.paidAmount,
    depositAmount: b.depositAmount, balanceDueAt: b.balanceDueAt, expiresAt: b.expiresAt, cancellationPolicy: b.cancellationPolicy as CancellationPolicyKey, cancelReason: b.cancelReason,
    startsAt: b.session.startsAt, experienceName: b.experience.name, hostName: b.experience.owner?.name ?? null, hostEmail: b.experience.owner?.email ?? b.experience.contactEmail ?? null,
  };
}

async function send(to: string | null | undefined, subject: string, text: string) {
  if (!to) return;
  try { await sendEmail({ to, subject, text }); } catch (e) { console.error("[bookings] email failed:", (e as Error).message); }
}

export type Notice =
  | { kind: "requestSent" } | { kind: "accepted" } | { kind: "declined" } | { kind: "confirmed"; receipt?: string | null } | { kind: "balancePaid" } | { kind: "balanceReminder" }
  | { kind: "cancelledByGuest"; refund: number; basis: string } | { kind: "cancelledByHost"; refund: number } | { kind: "cancelledByUs"; refund: number } | { kind: "expired"; why: "unpaid" | "no_answer" } | { kind: "balanceNotPaid" }
  | { kind: "refundSent"; amount: number; reference: string | null } | { kind: "lateRefund"; amount: number; why: string } | { kind: "sessionCancelled"; refund: number };

/** Sends the right emails for something that happened to a booking. Never throws. */
export async function notifyBooking(bookingId: string, n: Notice): Promise<void> {
  try {
    const b = await load(bookingId); const base = checkinBaseUrl();
    if (!b || !base) return;
    const subj = (s: string) => `${s} — ${b.reference}`;
    switch (n.kind) {
      case "requestSent": await send(b.guestEmail, subj("Request sent"), T.requestSent(b, base)); await send(b.hostEmail, subj("New booking request"), T.hostNewRequest(b, base)); break;
      case "accepted": await send(b.guestEmail, subj("Accepted — please pay to confirm"), T.accepted(b, base)); break;
      case "declined": await send(b.guestEmail, subj("Request declined"), T.declined(b)); break;
      case "confirmed": await send(b.guestEmail, subj("Booking confirmed"), T.confirmed(b, base, n.receipt)); await send(b.hostEmail, subj("New confirmed booking"), T.hostConfirmed(b, base)); break;
      case "balancePaid": await send(b.guestEmail, subj("Balance paid"), T.balancePaid(b, base)); break;
      case "balanceReminder": await send(b.guestEmail, subj("Balance due soon"), T.balanceReminder(b, base)); break;
      case "cancelledByGuest": await send(b.guestEmail, subj("Booking cancelled"), T.cancelledByGuest(b, n.refund, n.basis)); await send(b.hostEmail, subj("A guest cancelled"), T.hostGuestCancelled(b, base)); break;
      case "cancelledByHost": await send(b.guestEmail, subj("Your booking was cancelled"), T.cancelledByHost(b, n.refund)); break;
      case "cancelledByUs": await send(b.guestEmail, subj("Your booking was cancelled"), T.cancelledByUs(b, n.refund)); await send(b.hostEmail, subj("A booking was cancelled"), T.hostGuestCancelled(b, base)); break;
      case "expired": await send(b.guestEmail, subj("Booking lapsed"), T.expired(b, n.why)); break;
      case "balanceNotPaid": await send(b.guestEmail, subj("Booking cancelled — balance not paid"), T.balanceNotPaid(b)); break;
      case "refundSent": await send(b.guestEmail, subj("Refund sent"), T.refundSent(b, n.amount, n.reference)); break;
      case "lateRefund": await send(b.guestEmail, subj("Refund for your payment"), T.lateRefund(b, n.amount, n.why)); break;
      case "sessionCancelled": await send(b.guestEmail, subj("This date was cancelled"), T.sessionCancelled(b, n.refund)); break;
    }
  } catch (e) {
    console.error("[bookings] notify failed:", (e as Error).message);
  }
}

export { formatEatDate };
