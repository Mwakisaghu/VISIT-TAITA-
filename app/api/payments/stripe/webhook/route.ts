import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { restockOrderItems } from "@/lib/actions/payments";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid signature: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.client_reference_id;
    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      // Idempotency guard — Stripe may deliver the same event more than once.
      if (order && order.paymentStatus === "PENDING") {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: "PAID",
            paidAt: new Date(),
            stripePaymentIntentId:
              typeof session.payment_intent === "string" ? session.payment_intent : undefined,
            status: order.status === "PENDING" ? "CONFIRMED" : order.status,
          },
        });
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.client_reference_id;
    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (order && order.paymentStatus === "PENDING") {
        await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: "FAILED" } });
        await restockOrderItems(orderId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
