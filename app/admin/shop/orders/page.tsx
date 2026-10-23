import Link from "next/link";
import { prisma } from "@/lib/prisma";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";
import { CancelOrderForm } from "@/components/admin/OrderCancelForms";
import { formatPrice, fulfillmentLabel } from "@/lib/format";
import { paidAmount, paymentUnconfirmed, refundCeiling } from "@/lib/order-refunds";
import { requireManagerPage } from "@/lib/user-admin-server";

export const dynamic = "force-dynamic";

const refundLine = (r: { amount: number; status: string; reference: string | null; note: string | null }) =>
  `Refund ${formatPrice(r.amount)}: ${r.status === "SENT" ? `sent${r.reference ? ` (receipt ${r.reference})` : ""}` : r.status === "FAILED" ? `failed${r.note ? `: ${r.note}` : ""}` : "waiting to be sent"}`;

export default async function AdminOrdersPage() {
  await requireManagerPage(); // orders hold customers' names, phones and addresses, and cancelling one can lead to money going out: admins only (the actions check again)
  const [orders, waiting] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { buyer: { select: { name: true, email: true } }, items: { include: { product: true } }, refunds: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.orderRefund.count({ where: { status: { in: ["PENDING", "FAILED"] } } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Taita Made — Orders</h1>

      <p className="mt-3"><Link href="/admin/shop/orders/refunds" className="focus-ring rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust">Refunds to send ({waiting})</Link></p>

      <div className="mt-8 divide-y divide-stone/10">
        {orders.map((order) => (
          <div key={order.id} className="py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg text-stone">{order.orderNumber}</p>
                <p className="font-body text-sm text-stone/80">
                  {order.buyer ? `${order.buyer.name} · ${order.buyer.email}` : "Deleted account"} · {order.phone}
                </p>
                <p className="font-body text-xs text-stone/80">
                  {fulfillmentLabel(order.fulfillment)}
                  {order.address ? ` · ${order.address}` : ""}
                </p>
                <p className="mt-1 font-body text-xs">
                  <span
                    className={
                      order.paymentStatus === "PAID"
                        ? "text-canopy"
                        : order.paymentStatus === "FAILED"
                          ? "text-rust"
                          : "text-stone/80"
                    }
                  >
                    {order.paymentMethod === "NONE" ? "No payment method" : order.paymentMethod} ·{" "}
                    {order.paymentStatus}
                    {order.paymentFailureReason ? ` — ${order.paymentFailureReason}` : ""}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <p className="font-display text-lg text-stone">{formatPrice(order.totalAmount)}</p>
                {order.status === "CANCELLED"
                  ? <span className="rounded-full bg-stone/10 px-3 py-1 font-body text-sm text-stone">Cancelled</span>
                  : <OrderStatusSelect orderId={order.id} status={order.status} />}
              </div>
            </div>

            <ul className="mt-2 font-body text-sm text-stone/80">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.quantity} × {item.product.name}
                  {item.option ? ` (${item.option})` : ""}
                </li>
              ))}
            </ul>

            {order.status === "CANCELLED" && <p className="mt-2 font-body text-sm text-stone/80">Cancelled{order.cancelReason ? `: ${order.cancelReason}` : ""}</p>}
            {order.refunds.map((r) => <p key={r.id} className="mt-1 font-body text-xs text-stone/80">{refundLine(r)}</p>)}
            {order.status !== "CANCELLED" && (
              <details className="mt-2">
                <summary className="cursor-pointer font-body text-sm text-rust">Cancel order…</summary>
                <CancelOrderForm orderId={order.id} paid={paidAmount(order)} ceiling={refundCeiling(order)} holdsStock={!order.stockReleasedAt && order.paymentStatus !== "FAILED"} fulfilled={order.status === "FULFILLED"} inFlight={order.paymentStatus === "PENDING" && !paymentUnconfirmed(order)} />
              </details>
            )}
          </div>
        ))}
        {orders.length === 0 && <p className="py-8 font-body text-stone/80">No orders yet.</p>}
      </div>
    </div>
  );
}
