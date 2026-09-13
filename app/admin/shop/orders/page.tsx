import { prisma } from "@/lib/prisma";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";
import { formatPrice, fulfillmentLabel } from "@/lib/format";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { buyer: true, items: { include: { product: true } } },
  });

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Taita Made — Orders</h1>

      <div className="mt-8 divide-y divide-stone/10">
        {orders.map((order) => (
          <div key={order.id} className="py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg text-stone">{order.orderNumber}</p>
                <p className="font-body text-sm text-stone/60">
                  {order.buyer.name} · {order.buyer.email} · {order.phone}
                </p>
                <p className="font-body text-xs text-stone/50">
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
                          : "text-stone/50"
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
                <OrderStatusSelect orderId={order.id} status={order.status} />
              </div>
            </div>

            <ul className="mt-2 font-body text-sm text-stone/50">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.quantity} × {item.product.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {orders.length === 0 && <p className="py-8 font-body text-stone/50">No orders yet.</p>}
      </div>
    </div>
  );
}
