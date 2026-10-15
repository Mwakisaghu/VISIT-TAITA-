import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import SubpageFrame, { EmptyList, ListCard } from "@/components/account-hub/SubpageFrame";
import { formatLong, isOpenOrder, orderState } from "@/lib/account-hub-rules";
import { ksh, orderChip } from "@/lib/account-hub-text";
import { authOptions } from "@/lib/auth";
import { getLocale, lp, tr } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> { return { title: tr("My orders") }; }
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`${lp("/login")}?next=%2Faccount%2Forders`);
  const l = getLocale();
  const orders = await prisma.order.findMany({
    where: { buyerId: session.user.id }, orderBy: { createdAt: "desc" }, take: 100,
    select: { id: true, orderNumber: true, status: true, paymentStatus: true, totalAmount: true, createdAt: true, items: { select: { quantity: true, product: { select: { name: true } } } } },
  });
  const open = orders.filter(isOpenOrder), earlier = orders.filter((o) => !isOpenOrder(o));
  const list = (rows: typeof orders) => (
    <ul className="flex flex-col gap-3" role="list">
      {rows.map((o) => {
        const first = o.items[0]?.product.name, rest = o.items.reduce((n, i) => n + i.quantity, 0) - (o.items[0]?.quantity ?? 0);
        const what = first ? (rest === 0 ? first : rest === 1 ? tr("{item} and 1 other item", { item: first }) : tr("{item} and {n} other items", { item: first, n: rest })) : tr("Your order");
        return <ListCard key={o.id} title={tr("Taita Made, order {number}", { number: o.orderNumber })} href={lp(`/shop/orders/${o.id}`)} meta={tr("{date}. {what}, {amount}.", { date: formatLong(o.createdAt, l), what, amount: ksh(o.totalAmount, l) })} chip={orderChip(orderState(o))} />;
      })}
    </ul>
  );
  return (
    <SubpageFrame title={tr("My orders")} intro={tr("What you have bought in the Taita Made shop, and where each order is.")}>
      {orders.length === 0 ? (
        <EmptyList title={tr("No orders yet")} body={tr("When you buy something in the Taita Made shop, its status appears here.")} actions={[{ label: tr("Browse the shop"), href: lp("/shop") }]} />
      ) : (
        <div className="flex flex-col gap-8">
          {open.length > 0 && <section aria-labelledby="open-h"><h2 id="open-h" className="mb-3 font-display text-xl font-semibold">{tr("In progress")}</h2>{list(open)}</section>}
          {earlier.length > 0 && <section aria-labelledby="earlier-h"><h2 id="earlier-h" className="mb-3 font-display text-xl font-semibold">{tr("Earlier orders")}</h2>{list(earlier)}</section>}
        </div>
      )}
    </SubpageFrame>
  );
}
