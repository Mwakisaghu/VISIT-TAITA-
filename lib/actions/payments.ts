"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initiateStkPush } from "@/lib/mpesa";
import { submitOrderRequest, getTransactionStatus, type PesapalTransactionStatus } from "@/lib/pesapal";

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

export async function initiateMpesaPayment(orderId: string) {
  const result = await getOwnedOrder(orderId);
  if ("error" in result) return { error: result.error };
  const { order } = result;

  if (order.paymentStatus === "PAID") {
    return { error: "This order is already paid." };
  }

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
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED", paymentFailureReason: reason },
    });
    return { error: reason };
  }
}

/** Starts a Pesapal-hosted checkout (cards, plus M-Pesa/Airtel Money on Pesapal's own page). */
export async function createPesapalOrder(orderId: string) {
  const result = await getOwnedOrder(orderId);
  if ("error" in result) return { error: result.error };
  const { order } = result;

  if (order.paymentStatus === "PAID") {
    return { error: "This order is already paid." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return { error: "Payments are not fully configured (missing NEXT_PUBLIC_APP_URL)." };
  }

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
    return { error: err instanceof Error ? err.message : "Could not start card checkout." };
  }
}

/**
 * Fetches the latest status from Pesapal for an order's current tracking id
 * and updates our record. Idempotent — only acts while still PENDING. Used
 * by both the IPN webhook and the order confirmation page (Pesapal's
 * callback redirect doesn't carry the status itself, so the page checks too
 * rather than waiting on the IPN alone).
 */
export async function syncPesapalOrderStatus(orderTrackingId: string) {
  const order = await prisma.order.findFirst({ where: { pesapalOrderTrackingId: orderTrackingId } });
  if (!order) return;
  if (order.paymentStatus !== "PENDING") return;

  let result: PesapalTransactionStatus;
  try {
    result = await getTransactionStatus(orderTrackingId);
  } catch (err) {
    console.error(`[pesapal] getTransactionStatus failed for order ${order.orderNumber}:`, err);
    return;
  }

  if (result.payment_status_description === "COMPLETED") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        paymentFailureReason: null,
        pesapalConfirmationCode: result.confirmation_code,
        status: order.status === "PENDING" ? "CONFIRMED" : order.status,
      },
    });
    revalidatePath(`/shop/orders/${order.id}`);
  } else if (
    result.payment_status_description === "FAILED" ||
    result.payment_status_description === "INVALID" ||
    result.payment_status_description === "REVERSED"
  ) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "FAILED",
        paymentFailureReason: `Pesapal: ${result.payment_status_description}`,
      },
    });
    await restockOrderItems(order.id);
    revalidatePath(`/shop/orders/${order.id}`);
  }
  // Any other status (e.g. still awaiting the customer) — leave as PENDING.
}

/** Lightweight status check for the confirmation page's polling. */
export async function getOrderPaymentStatus(orderId: string) {
  const result = await getOwnedOrder(orderId);
  if ("error" in result) return { error: result.error };
  return { status: result.order.paymentStatus };
}

/** Puts inventory back when a payment fails/expires after stock was already decremented at checkout. */
export async function restockOrderItems(orderId: string) {
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { inventory: { increment: item.quantity } },
    });
  }
}
