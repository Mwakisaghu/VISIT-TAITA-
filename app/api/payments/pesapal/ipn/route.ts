import { NextResponse } from "next/server";
import { syncPesapalOrderStatus } from "@/lib/actions/payments";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderTrackingId = searchParams.get("OrderTrackingId");
  const orderMerchantReference = searchParams.get("OrderMerchantReference");
  const orderNotificationType = searchParams.get("OrderNotificationType") ?? "IPNCHANGE";

  if (orderTrackingId) {
    try {
      await syncPesapalOrderStatus(orderTrackingId);
    } catch {
      // Swallow errors here — Pesapal will retry the IPN, and the order
      // confirmation page also syncs status independently on load.
    }
  }

  // Pesapal expects this shape acknowledged back, mirroring what it sent.
  return NextResponse.json({
    orderNotificationType,
    orderTrackingId,
    orderMerchantReference,
    status: 200,
  });
}
