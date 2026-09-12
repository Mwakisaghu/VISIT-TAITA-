import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PaymentStatusPoller from "@/components/marketplace/PaymentStatusPoller";
import { formatPrice, fulfillmentLabel, orderStatusLabel } from "@/lib/format";

export default async function OrderConfirmationPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: true } } },
  });
  if (!order) notFound();

  const isOwner = order.buyerId === session.user.id;
  const isAdmin = ADMIN_ROLES.includes(session.user.role);
  if (!isOwner && !isAdmin) notFound();

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-lg">
        <p className="font-body text-sm text-rust">Order {order.orderNumber}</p>
        <h1 className="mt-1 font-display text-3xl text-stone">
          {order.paymentStatus === "PAID" ? "Thank you." : "Almost there."}
        </h1>
        <p className="mt-2 font-body text-stone/70">
          Status: {orderStatusLabel(order.status)} · {fulfillmentLabel(order.fulfillment)}
        </p>

        <div className="mt-4">
          <PaymentStatusPoller
            orderId={order.id}
            status={order.paymentStatus}
            paymentMethod={order.paymentMethod}
          />
        </div>

        <div className="mt-8 divide-y divide-stone/10 rounded-sm border border-stone/10 p-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between py-3 font-body text-sm text-stone/70">
              <span>
                {item.quantity} × {item.product.name}
              </span>
              <span>{formatPrice(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-3 font-display text-lg text-stone">
            <span>Total</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
        </div>

        <p className="mt-6 font-body text-sm text-stone/60">
          We&apos;ll reach you on {order.phone} to confirm{" "}
          {order.fulfillment === "SHIPPING" ? "delivery" : "pickup"} details.
        </p>

        <Link
          href="/shop"
          className="focus-ring mt-8 inline-block rounded-full border border-stone/20 px-6 py-3 font-body text-sm text-stone hover:border-rust hover:text-rust"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
