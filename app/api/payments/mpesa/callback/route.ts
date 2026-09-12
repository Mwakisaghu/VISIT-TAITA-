import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractCallbackMetadata, type MpesaCallbackBody } from "@/lib/mpesa";
import { restockOrderItems } from "@/lib/actions/payments";

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
  if (!order) return ACK;

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
        mpesaReceiptNumber: meta.receiptNumber,
        status: order.status === "PENDING" ? "CONFIRMED" : order.status,
      },
    });
  } else {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED" },
    });
    await restockOrderItems(order.id);
  }

  return ACK;
}
