// Ticket emails: plain-text service messages. Never throw (a failed email must not undo a ticket); the email layer keeps its own retry queue.
import { checkinBaseUrl } from "@/lib/checkin-url";
import { sendEmail } from "@/lib/email";
import { formatEat } from "@/lib/booking";
import { kes, paymentInstructions, type PaymentEvent } from "@/lib/ticket";

const first = (n: string) => (n || "").trim().split(/\s+/)[0] || "there";
const send = async (to: string, subject: string, text: string) => { try { await sendEmail({ to, subject, text }); } catch (e) { console.error("[tickets] email failed:", (e as Error).message); } };
const link = (groupId: string) => `${checkinBaseUrl() ?? ""}/tickets/${groupId}`;
type Base = { to: string; holder: string; eventName: string; eventDate: Date; groupId: string; numbers: string[] };
const what = (b: Base) => `${b.eventName} — ${formatEat(b.eventDate)}\nTicket${b.numbers.length === 1 ? "" : "s"}: ${b.numbers.join(", ")}`;

export const notifyIssued = (b: Base) => send(b.to, `Your ticket${b.numbers.length === 1 ? "" : "s"} for ${b.eventName}`, `Hello ${first(b.holder)},\n\nYou're in! ${b.numbers.length === 1 ? "Here is your ticket" : "Here are your tickets"}:\n\n${what(b)}\n\nShow the QR code on your ticket page at the door (or give the ticket number): ${link(b.groupId)}\n\nIf your plans change, you can cancel on that page.\n\nVisit Taita`);

export const notifyReserved = (b: Base & { event: PaymentEvent; quantity: number; expiresAt: Date | null }) => {
  const p = paymentInstructions(b.event, b.numbers[0], b.quantity);
  return send(b.to, `Pay to confirm your tickets for ${b.eventName}`, `Hello ${first(b.holder)},\n\nWe're holding your ${b.quantity === 1 ? "ticket" : `${b.quantity} tickets`} — they only become valid once your payment is confirmed.\n\n${what(b)}\n\nHOW TO PAY\n${p.lines.join("\n")}\n\nAfterwards, open your ticket page and type in the M-Pesa confirmation code from your message, so the organiser can match your payment quickly: ${link(b.groupId)}\n${b.expiresAt ? `\nWe'll hold the tickets until ${formatEat(b.expiresAt)}. If the payment hasn't been confirmed by then they're released.\n` : ""}\nVisit Taita`);
};

export const notifyConfirmed = (b: Base) => send(b.to, `Your tickets for ${b.eventName} are confirmed`, `Hello ${first(b.holder)},\n\nYour payment has been confirmed and your ${b.numbers.length === 1 ? "ticket is" : "tickets are"} valid.\n\n${what(b)}\n\nShow the QR code at the door: ${link(b.groupId)}\n\nVisit Taita`);

export const notifyCancelled = (b: Base & { by: "ORGANISER" | "ADMIN"; reason: string | null; wasPaid: boolean }) => send(b.to, `Your tickets for ${b.eventName} were cancelled`, `Hello ${first(b.holder)},\n\nYour ${b.numbers.length === 1 ? "ticket" : "tickets"} for ${b.eventName} (${b.numbers.join(", ")}) ${b.numbers.length === 1 ? "has" : "have"} been cancelled by the ${b.by === "ADMIN" ? "Visit Taita team" : "organiser"}.${b.reason ? `\nReason: ${b.reason}` : ""}\n${b.wasPaid ? "\nIf you had already paid, please contact the organiser about a refund: the payment went to them, not to Visit Taita.\n" : ""}\nVisit Taita`);
