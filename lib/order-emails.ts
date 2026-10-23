// Order emails: plain-text service messages (no marketing, no tracking), the same style as the booking emails. The text builders are pure; the sender is best-effort and never throws (a failed email never
// undoes a payment, a cancellation or a refund: the email layer keeps its own retry queue). A buyer who deleted their account has no email on the order and is simply not written to.
import { checkinBaseUrl } from "@/lib/checkin-url";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { REFUND_WORKING_DAYS } from "@/lib/refund-policy";

const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
const first = (name: string) => name.trim().split(/\s+/)[0] || "there";
const sign = ["", "Visit Taita"];
const lines = (...l: (string | null | false | undefined)[]) => l.filter((x) => x !== null && x !== false && x !== undefined).join("\n");

export type MailItem = { name: string; quantity: number; option: string | null };
export type MailOrder = {
  id: string; orderNumber: string; buyerName: string; buyerEmail: string; cancelReason: string | null; paymentMethod: string;
  totalAmount: number; fulfillment: string; address: string | null; phone: string; receipt: string | null; items: MailItem[];
};
const where = (o: MailOrder) => (o.paymentMethod === "CARD" ? "back to the card you paid with" : "to your M-Pesa number");
const takes = (o: MailOrder) => `We send refunds ${where(o)} by hand, normally within ${REFUND_WORKING_DAYS} working days, and we'll email you when it has been sent.`;

export const T = {
  confirmed: (o: MailOrder, base: string) =>
    lines(`Hi ${first(o.buyerName)},`, "", `Thank you: we've received your payment of ${kes(o.totalAmount)} for order ${o.orderNumber}.`, "", "Your order:",
      ...o.items.map((i) => `${i.quantity} x ${i.name}${i.option ? ` (${i.option})` : ""}`), "",
      `Total: ${kes(o.totalAmount)} (${o.paymentMethod === "CARD" ? "paid by card" : "paid with M-Pesa"}${o.receipt ? `, receipt ${o.receipt}` : ""})`, "",
      o.fulfillment === "SHIPPING" ? `We'll deliver it to: ${o.address ?? "the address you gave"}. We'll call you on ${o.phone} to confirm delivery.` : `You'll collect it in person. We'll call you on ${o.phone} to arrange pickup.`, "",
      `If something is not right, our rules on refunds and cancellations are here: ${base}/refunds`, `Your order: ${base}/shop/orders/${o.id}`, ...sign),
  cancelled: (o: MailOrder, refund: number, inFlight: boolean, base: string) =>
    lines(`Hi ${first(o.buyerName)},`, "", `We have cancelled your order ${o.orderNumber}.`, o.cancelReason ? `Reason: ${o.cancelReason}` : null, "",
      refund > 0 ? `A refund of ${kes(refund)} is on its way. ${takes(o)}` : inFlight ? "If a payment you started still arrives, we'll refund it in full and email you." : "You haven't been charged anything, so there is nothing to refund.",
      "", `${base}/shop/orders/${o.id}`, ...sign),
  partRefund: (o: MailOrder, amount: number, reason: string, base: string) =>
    lines(`Hi ${first(o.buyerName)},`, "", `We are refunding ${kes(amount)} of your order ${o.orderNumber}: ${reason}.`, "The rest of your order stays as it is.", takes(o), "", `${base}/shop/orders/${o.id}`, ...sign),
  refundSent: (o: MailOrder, amount: number, reference: string | null) =>
    lines(`Hi ${first(o.buyerName)},`, "", `We've sent your refund of ${kes(amount)} for order ${o.orderNumber}${reference ? ` (reference ${reference})` : ""} ${where(o)}.`, o.paymentMethod === "CARD" ? "Your bank may take a few days to show it." : null, ...sign),
  lateRefund: (o: MailOrder, amount: number) =>
    lines(`Hi ${first(o.buyerName)},`, "", `We received a payment of ${kes(amount)} for order ${o.orderNumber} after it had been cancelled, so we are refunding it in full.`, takes(o), ...sign),
};

export type OrderNotice =
  | { kind: "confirmed" } | { kind: "cancelled"; refund: number; inFlight: boolean } | { kind: "partRefund"; amount: number; reason: string }
  | { kind: "refundSent"; amount: number; reference: string | null } | { kind: "lateRefund"; amount: number };

/** Sends the right email for something that happened to an order. Never throws. */
export async function notifyOrder(orderId: string, n: OrderNotice): Promise<void> {
  try {
    const o = await prisma.order.findUnique({ where: { id: orderId }, include: { buyer: { select: { name: true, email: true } }, items: { include: { product: { select: { name: true } } } } } });
    const base = checkinBaseUrl();
    if (!o?.buyer?.email || !base) return;
    if (n.kind === "confirmed" && o.status === "CANCELLED") return; // a cancelled order is never "confirmed"
    const m: MailOrder = {
      id: o.id, orderNumber: o.orderNumber, buyerName: o.buyer.name, buyerEmail: o.buyer.email, cancelReason: o.cancelReason, paymentMethod: o.paymentMethod, totalAmount: o.totalAmount, fulfillment: o.fulfillment,
      address: o.address, phone: o.phone, receipt: o.mpesaReceiptNumber ?? o.pesapalConfirmationCode ?? null, items: o.items.map((i) => ({ name: i.product?.name ?? "Item", quantity: i.quantity, option: i.option })),
    };
    const subj = (s: string) => `${s} - ${o.orderNumber}`;
    const send = (subject: string, text: string) => sendEmail({ to: m.buyerEmail, subject, text });
    if (n.kind === "confirmed") await send(subj("Order confirmed"), T.confirmed(m, base));
    else if (n.kind === "cancelled") await send(subj("Order cancelled"), T.cancelled(m, n.refund, n.inFlight, base));
    else if (n.kind === "partRefund") await send(subj("Part refund"), T.partRefund(m, n.amount, n.reason, base));
    else if (n.kind === "refundSent") await send(subj("Refund sent"), T.refundSent(m, n.amount, n.reference));
    else await send(subj("Refund for a late payment"), T.lateRefund(m, n.amount));
  } catch (e) { console.error("[orders] email failed:", (e as Error).message); }
}
