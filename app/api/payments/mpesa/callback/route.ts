import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractCallbackMetadata, type MpesaCallbackBody } from "@/lib/mpesa";
import { restockOrderItems } from "@/lib/actions/payments";
import { handleMpesaCallback } from "@/lib/booking-payments";

// Safaricom expects a 200 with this exact shape regardless of outcome —
// otherwise it treats the callback as failed and retries.
const ACK = NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

export async function POST(request: Request) {
  let body: MpesaCallbackBody;
  try {
    body = await request.json();
  } catch {
    return ACK;
  }

  const callback = body?.Body?.stkCallback;
  if (!callback) return ACK;

  const order = await prisma.order.findFirst({
    where: { mpesaCheckoutRequestId: callback.CheckoutRequestID },
  });
  if (!order) {
    // Not a shop order: it may be an experience booking. (That handler never trusts this request — it asks Safaricom.)
    try {
      await handleMpesaCallback(body);
    } catch (err) {
      console.error("[mpesa callback] booking handler failed:", (err as Error).message);
    }
    return ACK;
  }

  // Idempotency guard: only act the first time this order transitions out
  // of PENDING — Safaricom (like most payment providers) may deliver the
  // same callback more than once.
  if (order.paymentStatus !== "PENDING") return ACK;

  if (callback.ResultCode === 0) {
    const meta = extractCallbackMetadata(callback.CallbackMetadata?.Item);
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        paymentFailureReason: null,
        mpesaReceiptNumber: meta.receiptNumber,
        status: order.status === "PENDING" ? "CONFIRMED" : order.status,
      },
    });
  } else {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED", paymentFailureReason: callback.ResultDesc },
    });
    await restockOrderItems(order.id);
  }

  return ACK;
}
