import Link from "next/link";
import { OrderRefundForm } from "@/components/admin/OrderCancelForms";
import { prisma } from "@/lib/prisma";
import { requireManagerPage } from "@/lib/user-admin-server";

export const dynamic = "force-dynamic";

export default async function OrderRefundsPage() {
  await requireManagerPage(); // money going out: admins only
  const [todo, done] = await Promise.all([
    prisma.orderRefund.findMany({ where: { status: { in: ["PENDING", "FAILED"] } }, orderBy: { createdAt: "asc" }, take: 200, include: { order: { select: { orderNumber: true, buyer: { select: { name: true } } } } } }),
    prisma.orderRefund.findMany({ where: { status: "SENT" }, orderBy: { processedAt: "desc" }, take: 30, include: { order: { select: { orderNumber: true } } } }),
  ]);
  return (
    <div>
      <Link href="/admin/shop/orders" className="font-body text-sm text-stone/80 hover:text-rust">Orders</Link>
      <h1 className="mt-3 font-display text-3xl text-stone">Refunds to send</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-stone/80">Shop refunds are sent by hand (M-Pesa to the number shown, or a card refund in your Pesapal account). Send each one, then record its receipt here: the customer is emailed when you do. If you cannot send one, mark it as failed with a note so it is not forgotten.</p>
      <ul className="mt-6 divide-y divide-stone/10">
        {todo.map((r) => (
          <li key={r.id} className="py-4">
            <p className="font-body text-sm text-stone"><strong>KES {r.amount.toLocaleString("en-KE")}</strong> : {r.method === "MPESA" ? <>M-Pesa <code>{r.destination ?? "(no number recorded)"}</code></> : "card (refund it in your Pesapal account)"}</p>
            <p className="font-body text-xs text-stone/80">{r.order.orderNumber} : {r.order.buyer?.name ?? "Deleted account"} : {r.reason}{r.paymentReference ? ` : paid with receipt ${r.paymentReference}` : ""}{r.status === "FAILED" ? ` : FAILED earlier: ${r.note ?? ""}` : ""}</p>
            <OrderRefundForm refundId={r.id} />
          </li>
        ))}
        {todo.length === 0 && <li className="py-6 font-body text-sm text-stone/80">Nothing to send.</li>}
      </ul>
      {done.length > 0 && <><h2 className="mt-12 font-display text-xl text-stone">Recently sent</h2><ul className="mt-2 font-body text-sm text-stone/80">{done.map((r) => <li key={r.id}>KES {r.amount.toLocaleString("en-KE")} : {r.order.orderNumber}{r.reference ? ` : receipt ${r.reference}` : ""}</li>)}</ul></>}
    </div>
  );
}
