// Refunds owed to shop customers. A refund is only a RECORD that money is owed back: it is sent by hand and then marked sent with its receipt (lib/order-admin-ops.ts).
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = Pick<PrismaClient, "order" | "orderRefund"> | Prisma.TransactionClient;
export type RefundRef = { id: string; amount: number };

/** The reason written on the refund made automatically when a payment arrives for an order that was cancelled meanwhile. */
export const LATE_PAYMENT_REASON = "Paid after the order was cancelled";

type Money = { paymentStatus: string; totalAmount: number; paymentFailureReason: string | null; refundedAmount?: number };

/**
 * The site flags an order when money arrived that it could not apply: a payment AFTER the order failed, or for the wrong amount (lib/shop-payments.ts writes these words into the order's failure reason).
 * The site has NOT confirmed such a payment, but a person who has checked the M-Pesa statement may need to refund it.
 */
export const paymentUnconfirmed = (o: { paymentStatus: string; paymentFailureReason: string | null }): boolean => o.paymentStatus !== "PAID" && /^(A payment arrived|Amount mismatch)/.test(o.paymentFailureReason ?? "");

/** What was CONFIRMED as paid, and the most that can be refunded IN TOTAL: for an unconfirmed flagged payment the whole order total, once an admin has checked the statement; otherwise only what was confirmed. */
export const paidAmount = (o: { paymentStatus: string; totalAmount: number }): number => (o.paymentStatus === "PAID" ? o.totalAmount : 0);
export const refundCeiling = (o: Money): number => (o.paymentStatus === "PAID" || paymentUnconfirmed(o) ? o.totalAmount : 0);
/** What is still left: the confirmed amount (the default for a refund) and the ceiling, each less what has already been refunded or is owed back. */
export const paidLeft = (o: Money): number => Math.max(0, paidAmount(o) - (o.refundedAmount ?? 0));
export const refundLeft = (o: Money): number => Math.max(0, refundCeiling(o) - (o.refundedAmount ?? 0));

/** Thrown when another refund took the room first: the running total would have gone over the limit. */
export class RefundLimitError extends Error {}

/**
 * Writes a refund as owed, with what the person sending it needs: the method, the number to send to, and the receipt of the ORIGINAL payment (to find it on the statement).
 * The order's running total is claimed FIRST and atomically: with a `limit`, only if it would not go over it. Always call it inside a transaction.
 */
export async function createRefund(db: Db, o: { orderId: string; amount: number; reason: string; createdById: string | null; limit?: number }): Promise<RefundRef> {
  const order = await db.order.findUnique({ where: { id: o.orderId }, select: { paymentMethod: true, phone: true, mpesaReceiptNumber: true, pesapalConfirmationCode: true } });
  if (!order) throw new Error("order not found");
  const claimed = await db.order.updateMany({ where: o.limit === undefined ? { id: o.orderId } : { id: o.orderId, refundedAmount: { lte: o.limit - o.amount } }, data: { refundedAmount: { increment: o.amount } } });
  if (claimed.count !== 1) throw new RefundLimitError("the refund total changed");
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
