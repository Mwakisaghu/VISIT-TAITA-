"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initiateStkPush } from "@/lib/mpesa";
import { getStripeClient } from "@/lib/stripe";

async function getOwnedOrder(orderId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "You need to sign in." } as const;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
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
        mpesaCheckoutRequestId: stk.CheckoutRequestID,
        mpesaMerchantRequestId: stk.MerchantRequestID,
      },
    });

    revalidatePath(`/shop/orders/${order.id}`);
    return { success: true as const };
  } catch (err) {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED" },
    });
    return { error: err instanceof Error ? err.message : "M-Pesa request failed." };
  }
}

export async function createStripeCheckoutSession(orderId: string) {
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

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      currency: "kes",
      line_items: order.items.map((item) => ({
        price_data: {
          currency: "kes",
          product_data: { name: item.product.name },
          unit_amount: item.unitPrice * 100,
        },
        quantity: item.quantity,
      })),
      client_reference_id: order.id,
      success_url: `${appUrl}/shop/orders/${order.id}?stripe=success`,
      cancel_url: `${appUrl}/shop/orders/${order.id}?stripe=cancel`,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: "CARD",
        paymentStatus: "PENDING",
        stripeSessionId: session.id,
      },
    });

    return { url: session.url! };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not start card checkout." };
  }
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
