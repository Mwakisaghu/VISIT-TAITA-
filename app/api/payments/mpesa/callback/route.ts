import { NextResponse } from "next/server";
import { handleMpesaCallback } from "@/lib/booking-payments";
import type { MpesaCallbackBody } from "@/lib/mpesa";
import { handleShopMpesaCallback } from "@/lib/shop-payments";

// Safaricom expects a 200 with this exact shape regardless of outcome — otherwise it treats the callback as failed and retries.
const ACK = NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

/**
 * This URL is public and Safaricom does not sign what it sends, so NOTHING in the request is believed. It only tells us which payment to
 * look at: the handlers below ask Safaricom directly what happened, check the amount, and only then change an order or a booking.
 */
export async function POST(request: Request) {
  let body: MpesaCallbackBody;
  try {
    body = await request.json();
  } catch {
    return ACK;
  }

  try {
    const wasShopOrder = await handleShopMpesaCallback(body);
    if (!wasShopOrder) await handleMpesaCallback(body); // not a shop order: maybe an experience booking
  } catch (err) {
    console.error("[mpesa callback] handler failed:", (err as Error).message);
  }
  return ACK;
}
