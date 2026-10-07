// Shop payments: confirming and settling orders. NOT a "use server" file: server actions are public endpoints, and "mark this order
// paid", "release this order's stock" or "sync this tracking id" must never be reachable from a browser.
//
// THE RULES
//  1. A payment is only believed after the PROVIDER confirms it, server to server (Safaricom's STK query, Pesapal's transaction status).
//     A request arriving at our public callback URL proves nothing — it only prompts that check. The same goes for FAILURE: a forged
//     "cancelled" callback must not be able to fail someone's genuine order and release its stock.
//  2. The amount the provider reports must equal the order total.
//  3. Every state change is claimed atomically (`PENDING -> X` only if still PENDING), so a callback, a page poll and an IPN racing
//     each other settle an order exactly once — and the stock is released exactly once.
//  4. THE STOCK INVARIANT: an order that is UNPAID, PENDING or PAID holds its stock; a FAILED order has released it. Retrying a failed
//     order therefore has to take the stock again (see retakeStock).
import type { Prisma } from "@prisma/client";
import { extractCallbackMetadata, queryStkPushStatus, type MpesaCallbackBody } from "@/lib/mpesa";
import { getTransactionStatus } from "@/lib/pesapal";
import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient;

// Safaricom words an unresolved request several ways ("being processed", "processing", "pending"); none of them is a final answer.
const STILL_PROCESSING = /being process|processing|pending|in progress/i;

/** Puts an order's stock back. Only ever called by the one caller that just moved the order to FAILED. */
async function releaseStock(db: Db, orderId: string) {
  const items = await db.orderItem.findMany({ where: { orderId } });
  for (const item of items) await db.product.update({ where: { id: item.productId }, data: { inventory: { increment: item.quantity } } });
}

/** Takes an order's stock again (for a retry after a failure). All or nothing: if any line is no longer in stock, nothing is taken. */
export async function retakeStock(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({ where: { orderId }, include: { product: { select: { name: true } } } });
      for (const item of items) {
        const taken = await tx.product.updateMany({ where: { id: item.productId, inventory: { gte: item.quantity } }, data: { inventory: { decrement: item.quantity } } });
        if (taken.count !== 1) throw new Error(`SOLD_OUT:${item.product?.name ?? "an item"}`);
      }
    });
    return { ok: true };
  } catch (e) {
    const m = /^SOLD_OUT:(.*)$/.exec((e as Error).message);
    if (m) return { ok: false, error: `Sorry — "${m[1]}" has sold out since this order was placed, so it can't be paid now. Please place a new order.` };
    throw e;
  }
}

/** PENDING -> PAID, once. Returns whether THIS caller made the change. */
async function settlePaid(orderId: string, now: Date, proof: { receipt?: string | null; confirmationCode?: string | null }): Promise<boolean> {
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: "PENDING" },
    data: { paymentStatus: "PAID", paidAt: now, paymentFailureReason: null, ...(proof.receipt ? { mpesaReceiptNumber: proof.receipt } : {}), ...(proof.confirmationCode ? { pesapalConfirmationCode: proof.confirmationCode } : {}) },
  });
  if (claimed.count !== 1) return false;
  await prisma.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "CONFIRMED" } });
  return true;
}

/** PENDING -> FAILED, once, releasing the stock in the same transaction (so it can neither be lost nor released twice). */
export async function settleFailed(orderId: string, reason: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({ where: { id: orderId, paymentStatus: "PENDING" }, data: { paymentStatus: "FAILED", paymentFailureReason: reason.slice(0, 300) } });
    if (claimed.count !== 1) return false;
    await releaseStock(tx, orderId);
    return true;
  });
}

/**
 * A payment couldn't even be STARTED (the provider refused the request). Keeps the invariant that a failed order has given its stock
 * back: a fresh (UNPAID) order becomes FAILED and releases it; a retry that had re-taken the stock releases it again.
 */
export async function failStart(orderId: string, reason: string, hadRetaken: boolean): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (hadRetaken) {
      await tx.order.updateMany({ where: { id: orderId }, data: { paymentFailureReason: reason.slice(0, 300) } });
      await releaseStock(tx, orderId);
      return;
    }
    const claimed = await tx.order.updateMany({ where: { id: orderId, paymentStatus: "UNPAID" }, data: { paymentStatus: "FAILED", paymentFailureReason: reason.slice(0, 300) } });
    if (claimed.count === 1) await releaseStock(tx, orderId);
  });
}

const flag = (orderId: string, why: string) => prisma.order.updateMany({ where: { id: orderId }, data: { paymentFailureReason: why.slice(0, 300) } });

/** Asks Safaricom what happened to an order's STK push and acts on its answer. `hints` (from a callback) are checked, never trusted. */
export async function confirmShopMpesa(orderId: string, hints: { receipt?: string | null; amount?: number | null } = {}, now: Date = new Date()): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentMethod !== "MPESA" || !order.mpesaCheckoutRequestId) return;

  if (order.paymentStatus === "PAID") {
    if (hints.receipt && !order.mpesaReceiptNumber) await prisma.order.updateMany({ where: { id: order.id, mpesaReceiptNumber: null }, data: { mpesaReceiptNumber: hints.receipt } });
    return;
  }
  // A payment that arrives AFTER the order was failed (and its stock released): verify it, and make sure a person sees it. Never silent.
  if (order.paymentStatus === "FAILED") {
    if (!hints.receipt || /^A payment arrived/.test(order.paymentFailureReason ?? "")) return;
    let q;
    try { q = await queryStkPushStatus(order.mpesaCheckoutRequestId); } catch { return; }
    if (q.ResultCode === "0") await flag(order.id, `A payment arrived after this order was marked failed (M-Pesa receipt ${hints.receipt}). The shop team will check it and refund or fulfil it — if you were charged, please contact us quoting this receipt.`);
    return;
  }
  if (order.paymentStatus !== "PENDING") return;

  if (hints.receipt) await prisma.order.updateMany({ where: { id: order.id, paymentStatus: "PENDING", mpesaReceiptNumber: null }, data: { mpesaReceiptNumber: hints.receipt } });
  let q;
  try { q = await queryStkPushStatus(order.mpesaCheckoutRequestId); } catch { return; } // no final answer yet: try again later

  if (q.ResultCode === "0") {
    if (hints.amount != null && Number(hints.amount) !== order.totalAmount) {
      await flag(order.id, `Amount mismatch — M-Pesa reports ${hints.amount}, the order total is ${order.totalAmount}. The shop team will check it.`);
      console.error(`[shop] AMOUNT MISMATCH on order ${order.orderNumber}: reported ${hints.amount}, expected ${order.totalAmount}`);
      return;
    }
    await settlePaid(order.id, now, { receipt: hints.receipt });
    return;
  }
  const desc = q.ResultDesc || "";
  if (!q.ResultCode || STILL_PROCESSING.test(desc)) return;
  await settleFailed(order.id, desc || "The payment was not completed.");
}

/** Asks Pesapal what happened to an order's card payment and acts on its answer. */
export async function confirmShopPesapal(orderTrackingId: string): Promise<void> {
  if (typeof orderTrackingId !== "string" || orderTrackingId.length < 3 || orderTrackingId.length > 100) return;
  const order = await prisma.order.findFirst({ where: { pesapalOrderTrackingId: orderTrackingId } });
  if (!order || order.paymentStatus !== "PENDING") return;
  let r;
  try { r = await getTransactionStatus(orderTrackingId); } catch (e) { console.error(`[shop] Pesapal status failed for ${order.orderNumber}:`, (e as Error).message); return; }

  if (r.payment_status_description === "COMPLETED") {
    if (Number(r.amount) !== order.totalAmount) {
      await flag(order.id, `Amount mismatch — Pesapal reports ${r.amount}, the order total is ${order.totalAmount}. The shop team will check it.`);
      console.error(`[shop] AMOUNT MISMATCH on order ${order.orderNumber}: reported ${r.amount}, expected ${order.totalAmount}`);
      return;
    }
    await settlePaid(order.id, new Date(), { confirmationCode: r.confirmation_code });
  } else if (["FAILED", "INVALID", "REVERSED"].includes(r.payment_status_description)) {
    await settleFailed(order.id, `Pesapal: ${r.payment_status_description}`);
  }
}

/** M-Pesa's callback. Returns whether it was a SHOP order's. The body is NOT trusted: it only prompts a check with Safaricom. */
export async function handleShopMpesaCallback(body: MpesaCallbackBody, now: Date = new Date()): Promise<boolean> {
  const cb = body?.Body?.stkCallback;
  if (!cb || typeof cb.CheckoutRequestID !== "string" || !cb.CheckoutRequestID) return false;
  const order = await prisma.order.findFirst({ where: { mpesaCheckoutRequestId: cb.CheckoutRequestID }, select: { id: true } });
  if (!order) return false;
  const meta = cb.ResultCode === 0 ? extractCallbackMetadata(cb.CallbackMetadata?.Item) : { receiptNumber: undefined, amount: undefined };
  await confirmShopMpesa(order.id, { receipt: meta.receiptNumber ?? null, amount: meta.amount ?? null }, now);
  return true;
}

/** Pesapal's IPN, and the page Pesapal sends the buyer back to. Safe to call for any id: only the provider's answer is acted on. */
export async function handleShopPesapalIpn(orderTrackingId: string): Promise<boolean> {
  if (typeof orderTrackingId !== "string" || !orderTrackingId) return false;
  const order = await prisma.order.findFirst({ where: { pesapalOrderTrackingId: orderTrackingId }, select: { id: true } });
  if (!order) return false;
  await confirmShopPesapal(orderTrackingId);
  return true;
}
