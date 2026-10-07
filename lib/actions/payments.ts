"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initiateStkPush } from "@/lib/mpesa";
import { submitOrderRequest } from "@/lib/pesapal";
import { confirmShopMpesa, confirmShopPesapal, failStart, retakeStock } from "@/lib/shop-payments";

async function getOwnedOrder(orderId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "You need to sign in." } as const;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } }, buyer: true },
  });
  if (!order) return { error: "Order not found." } as const;
  if (order.buyerId !== session.user.id) return { error: "Order not found." } as const;

  return { order } as const;
}

type OrderForPayment = { id: string; status: string; paymentStatus: string; paymentMethod: string; mpesaCheckoutRequestId: string | null; pesapalOrderTrackingId: string | null; updatedAt: Date };

/**
 * Runs before a payment is started. Refuses a cancelled or already-paid order; never lets a second prompt be sent on top of one that is
 * still in flight (the second would overwrite the first's tracking id, and if the FIRST then succeeded the money would be unrecognisable);
 * and — because a failed order has given its stock back — takes the stock again for a retry, or says it has sold out.
 */
async function readyToPay(order: OrderForPayment): Promise<{ ok: true; retook: boolean } | { ok: false; error: string }> {
  if (order.status === "CANCELLED") return { ok: false, error: "This order was cancelled, so it can't be paid." };
  if (order.paymentStatus === "PAID") return { ok: false, error: "This order is already paid." };
  if (order.paymentStatus === "PENDING") {
    // A payment may have just completed: ask the provider before sending another prompt.
    if (order.paymentMethod === "MPESA" && order.mpesaCheckoutRequestId) await confirmShopMpesa(order.id);
    else if (order.paymentMethod === "CARD" && order.pesapalOrderTrackingId) await confirmShopPesapal(order.pesapalOrderTrackingId);
    const fresh = await prisma.order.findUnique({ where: { id: order.id }, select: { paymentStatus: true, updatedAt: true } });
    if (fresh?.paymentStatus === "PAID") return { ok: false, error: "This order has just been paid. Thank you!" };
    if (fresh?.paymentStatus === "PENDING" && Date.now() - fresh.updatedAt.getTime() < 90_000) return { ok: false, error: "A payment request was just started. Please check your phone — or wait a minute and try again." };
  }
  if (order.paymentStatus === "FAILED") {
    const r = await retakeStock(order.id);
    if (!r.ok) return { ok: false, error: r.error };
    return { ok: true, retook: true };
  }
  return { ok: true, retook: false };
}

export async function initiateMpesaPayment(orderId: string) {
  const result = await getOwnedOrder(orderId);
  if ("error" in result) return { error: result.error };
  const { order } = result;

  const gate = await readyToPay(order);
  if (!gate.ok) return { error: gate.error };

  try {
    const stk = await initiateStkPush({
      phone: order.phone,
      amount: order.totalAmount,
      accountReference: order.orderNumber,
      description: `Visit Taita order ${order.orderNumber}`,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: "MPESA",
        paymentStatus: "PENDING",
        paymentFailureReason: null,
        mpesaCheckoutRequestId: stk.CheckoutRequestID,
        mpesaMerchantRequestId: stk.MerchantRequestID,
      },
    });

    revalidatePath(`/shop/orders/${order.id}`);
    return { success: true as const };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "M-Pesa request failed.";
    console.error(`[mpesa] initiateStkPush failed for order ${order.orderNumber}:`, reason);
    await failStart(order.id, reason, gate.retook); // back to FAILED, with its stock released
    return { error: reason };
  }
}

/** Starts a Pesapal-hosted checkout (cards, plus M-Pesa/Airtel Money on Pesapal's own page). */
export async function createPesapalOrder(orderId: string) {
  const result = await getOwnedOrder(orderId);
  if ("error" in result) return { error: result.error };
  const { order } = result;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return { error: "Payments are not fully configured (missing NEXT_PUBLIC_APP_URL)." };
  }

  // The buyer may have deleted their account since (the order is kept as an anonymous payment record).
  if (!order.buyer) {
    return { error: "This order's account no longer exists, so it can't be paid." };
  }

  const gate = await readyToPay(order);
  if (!gate.ok) return { error: gate.error };

  const [firstName, ...rest] = order.buyer.name.split(" ");

  try {
    const submitted = await submitOrderRequest({
      // Pesapal requires a unique merchant reference per attempt, not per
      // order — a retried payment reuses the order id, so we suffix with a
      // timestamp to keep each attempt distinct.
      merchantReference: `${order.orderNumber}-${Date.now()}`,
      amount: order.totalAmount,
      description: `Visit Taita order ${order.orderNumber}`,
      callbackUrl: `${appUrl}/shop/orders/${order.id}`,
      email: order.buyer.email,
      phone: order.phone,
      firstName,
      lastName: rest.join(" ") || firstName,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: "CARD",
        paymentStatus: "PENDING",
        pesapalOrderTrackingId: submitted.order_tracking_id,
        pesapalMerchantReference: submitted.merchant_reference,
      },
    });

    return { url: submitted.redirect_url };
  } catch (err) {
    await failStart(order.id, err instanceof Error ? err.message : "Could not start card checkout.", gate.retook);
    return { error: err instanceof Error ? err.message : "Could not start card checkout." };
  }
}

/**
 * Status check used by the confirmation page's polling. While an order is
 * still PENDING, this actively re-checks with the provider first (M-Pesa
 * query API, or Pesapal's transaction status) rather than only reading
 * whatever the last webhook happened to write — so a missed callback
 * doesn't leave the buyer stuck watching "Waiting..." forever.
 */
export async function getOrderPaymentStatus(orderId: string) {
  const result = await getOwnedOrder(orderId);
  if ("error" in result) return { error: result.error };
  const { order } = result;

  if (order.paymentStatus === "PENDING") {
    if (order.paymentMethod === "MPESA" && order.mpesaCheckoutRequestId) {
      await confirmShopMpesa(orderId);
    } else if (order.paymentMethod === "CARD" && order.pesapalOrderTrackingId) {
      await confirmShopPesapal(order.pesapalOrderTrackingId);
    }
    const fresh = await prisma.order.findUnique({ where: { id: orderId } });
    return { status: fresh?.paymentStatus ?? order.paymentStatus };
  }

  return { status: order.paymentStatus };
}
