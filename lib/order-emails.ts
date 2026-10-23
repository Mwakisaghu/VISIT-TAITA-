// Order emails: plain-text service messages (no marketing, no tracking), the same style as the booking emails. The text builders are pure; the sender is best-effort and never throws (a failed email never
// undoes a cancellation or a refund: the email layer keeps its own retry queue). A buyer who deleted their account has no email on the order and is simply not written to.
import { checkinBaseUrl } from "@/lib/checkin-url";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { REFUND_WORKING_DAYS } from "@/lib/refund-policy";

const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
const first = (name: string) => name.trim().split(/\s+/)[0] || "there";
const sign = ["", "Visit Taita"];
const lines = (...l: (string | null | false | undefined)[]) => l.filter((x) => x !== null && x !== false && x !== undefined).join("\n");

export type MailOrder = { id: string; orderNumber: string; buyerName: string; buyerEmail: string; cancelReason: string | null; paymentMethod: string };
const where = (o: MailOrder) => (o.paymentMethod === "CARD" ? "back to the card you paid with" : "to your M-Pesa number");
const takes = (o: MailOrder) => `We send refunds ${where(o)} by hand, normally within ${REFUND_WORKING_DAYS} working days, and we'll email you when it has been sent.`;

export const T = {
  cancelled: (o: MailOrder, refund: number, inFlight: boolean, base: string) =>
    lines(`Hi ${first(o.buyerName)},`, "", `We have cancelled your order ${o.orderNumber}.`, o.cancelReason ? `Reason: ${o.cancelReason}` : null, "",
      refund > 0 ? `A refund of ${kes(refund)} is on its way. ${takes(o)}` : inFlight ? "If a payment you started still arrives, we'll refund it in full and email you." : "You haven't been charged anything, so there is nothing to refund.",
      "", `${base}/shop/orders/${o.id}`, ...sign),
  refundSent: (o: MailOrder, amount: number, reference: string | null) =>
    lines(`Hi ${first(o.buyerName)},`, "", `We've sent your refund of ${kes(amount)} for order ${o.orderNumber}${reference ? ` (reference ${reference})` : ""} ${where(o)}.`, o.paymentMethod === "CARD" ? "Your bank may take a few days to show it." : null, ...sign),
  lateRefund: (o: MailOrder, amount: number) =>
    lines(`Hi ${first(o.buyerName)},`, "", `We received a payment of ${kes(amount)} for order ${o.orderNumber} after it had been cancelled, so we are refunding it in full.`, takes(o), ...sign),
};

export type OrderNotice = { kind: "cancelled"; refund: number; inFlight: boolean } | { kind: "refundSent"; amount: number; reference: string | null } | { kind: "lateRefund"; amount: number };

/** Sends the right email for something that happened to an order. Never throws. */
export async function notifyOrder(orderId: string, n: OrderNotice): Promise<void> {
  try {
    const o = await prisma.order.findUnique({ where: { id: orderId }, include: { buyer: { select: { name: true, email: true } } } });
    const base = checkinBaseUrl();
    if (!o?.buyer?.email || !base) return;
    const m: MailOrder = { id: o.id, orderNumber: o.orderNumber, buyerName: o.buyer.name, buyerEmail: o.buyer.email, cancelReason: o.cancelReason, paymentMethod: o.paymentMethod };
    const subj = (s: string) => `${s} - ${o.orderNumber}`;
    const send = (subject: string, text: string) => sendEmail({ to: m.buyerEmail, subject, text });
    if (n.kind === "cancelled") await send(subj("Order cancelled"), T.cancelled(m, n.refund, n.inFlight, base));
    else if (n.kind === "refundSent") await send(subj("Refund sent"), T.refundSent(m, n.amount, n.reference));
    else await send(subj("Refund for a late payment"), T.lateRefund(m, n.amount));
  } catch (e) { console.error("[orders] email failed:", (e as Error).message); }
}
