"use server";

import { revalidatePath } from "next/cache";
import { cancelOrder, processOrderRefund, refundOrderPart, setOrderStatus } from "@/lib/order-admin-ops";
import { prisma } from "@/lib/prisma";
import { currentManager } from "@/lib/user-admin-server";

// Server actions are public endpoints, so each one checks FOR ITSELF that the caller is an active admin or super admin, read fresh from the database (never from the session alone, and never an editor or
// a content manager), and does nothing otherwise. They are thin: the rules live in lib/order-admin-ops.ts.
export type OrderAdminResult = { ok: true; message?: string } | { ok: false; error: string };
const DENIED: OrderAdminResult = { ok: false, error: "Admin access required." };
const refresh = () => { revalidatePath("/admin/shop/orders"); revalidatePath("/admin/shop/orders/refunds"); revalidatePath("/shop/orders"); revalidatePath("/account/orders"); };

/** Moves an order between Pending, Confirmed and Fulfilled. (Cancelling has its own action.) */
export async function adminSetOrderStatus(orderId: string, status: string): Promise<OrderAdminResult> {
  const actor = await currentManager(); if (!actor) return DENIED;
  const r = await setOrderStatus(prisma, { orderId, status, actor });
  if (!r.ok) return r;
  refresh();
  return { ok: true, message: r.changed ? "Status updated." : "Nothing to change." };
}

/** Cancels an order for good: a reason, optionally money back (up to what was paid) and optionally the items back on the shelf. */
export async function adminCancelOrder(orderId: string, reason: string, refundAmount: number | string | null, restock: boolean): Promise<OrderAdminResult> {
  const actor = await currentManager(); if (!actor) return DENIED;
  const r = await cancelOrder(prisma, { orderId, reason, refundAmount, restock, actor });
  if (!r.ok) return r;
  refresh();
  const money = r.refund > 0 ? `KES ${r.refund.toLocaleString("en-KE")} to refund (see Refunds to send).` : r.inFlight ? "No refund yet: a payment was in progress, and if it arrives it will be refunded automatically." : "Nothing to refund.";
  return { ok: true, message: `Cancelled. ${money} ${r.stockNote} The customer has been emailed.` };
}

/** Records a refund you sent by hand (with its receipt), or that failed (with a note). */
export async function adminProcessOrderRefund(refundId: string, outcome: "SENT" | "FAILED", reference: string, note: string): Promise<OrderAdminResult> {
  const actor = await currentManager(); if (!actor) return DENIED;
  const r = await processOrderRefund(prisma, { refundId, outcome, reference, note, actor });
  if (!r.ok) return r;
  refresh();
  return { ok: true, message: r.outcome === "SENT" ? "Marked as sent. The customer has been emailed." : "Marked as failed." };
}

/** Refunds part of an order's money and leaves the order as it is. */
export async function adminRefundOrderPart(orderId: string, amount: number | string, reason: string): Promise<OrderAdminResult> {
  const actor = await currentManager(); if (!actor) return DENIED;
  const r = await refundOrderPart(prisma, { orderId, amount, reason, actor });
  if (!r.ok) return r;
  refresh();
  return { ok: true, message: `KES ${r.amount.toLocaleString("en-KE")} to refund (see Refunds to send). ${r.left > 0 ? `KES ${r.left.toLocaleString("en-KE")} is still left to refund on this order.` : "Everything paid has now been refunded."} The customer has been emailed.` };
}
