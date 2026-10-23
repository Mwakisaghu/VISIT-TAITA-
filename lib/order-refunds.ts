// Refunds owed to shop customers. A refund is only a RECORD that money is owed back: it is sent by hand and then marked sent with its receipt (lib/order-admin-ops.ts).
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = Pick<PrismaClient, "order" | "orderRefund"> | Prisma.TransactionClient;
export type RefundRef = { id: string; amount: number };

/**
 * The site flags an order when money arrived that it could not apply: a payment AFTER the order failed, or for the wrong amount (lib/shop-payments.ts writes these words into the order's failure reason).
 * The site has NOT confirmed such a payment, but a person who has checked the M-Pesa statement may need to refund it.
 */
export const paymentUnconfirmed = (o: { paymentStatus: string; paymentFailureReason: string | null }): boolean => o.paymentStatus !== "PAID" && /^(A payment arrived|Amount mismatch)/.test(o.paymentFailureReason ?? "");

/** What was CONFIRMED as paid (the default refund), and the most that can be refunded: for an unconfirmed flagged payment the whole order total, once an admin has checked the statement; otherwise only what was confirmed. */
export const paidAmount = (o: { paymentStatus: string; totalAmount: number }): number => (o.paymentStatus === "PAID" ? o.totalAmount : 0);
export const refundCeiling = (o: { paymentStatus: string; totalAmount: number; paymentFailureReason: string | null }): number => (o.paymentStatus === "PAID" || paymentUnconfirmed(o) ? o.totalAmount : 0);

/** The reason written on the refund made automatically when a payment arrives for an order that was cancelled meanwhile. */
export const LATE_PAYMENT_REASON = "Paid after the order was cancelled";

/** Writes a refund as owed, with what the person sending it needs: the method, the number to send to, and the receipt of the ORIGINAL payment (to find it on the statement). */
export async function createRefund(db: Db, o: { orderId: string; amount: number; reason: string; createdById: string | null }): Promise<RefundRef> {
  const order = await db.order.findUnique({ where: { id: o.orderId }, select: { paymentMethod: true, phone: true, mpesaReceiptNumber: true, pesapalConfirmationCode: true } });
  if (!order) throw new Error("order not found");
  const method = order.paymentMethod === "CARD" ? "CARD" : "MPESA";
  const r = await db.orderRefund.create({
    data: { orderId: o.orderId, amount: o.amount, reason: o.reason.slice(0, 300), method, destination: method === "MPESA" ? order.phone : null, paymentReference: order.mpesaReceiptNumber ?? order.pesapalConfirmationCode ?? null, createdById: o.createdById },
  });
  return { id: r.id, amount: r.amount };
}

/** Money has arrived for an order that was cancelled in the meantime (a payment that was already in flight): it is owed back in full. Made at most once. Returns the refund, or null when there is nothing to do. */
export async function refundIfCancelled(db: Db, orderId: string): Promise<RefundRef | null> {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true, paymentStatus: true, totalAmount: true } });
  if (!order || order.status !== "CANCELLED" || order.paymentStatus !== "PAID") return null;
  if (await db.orderRefund.findFirst({ where: { orderId, reason: LATE_PAYMENT_REASON }, select: { id: true } })) return null;
  return createRefund(db, { orderId, amount: order.totalAmount, reason: LATE_PAYMENT_REASON, createdById: null });
}
