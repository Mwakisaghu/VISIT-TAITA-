// The ONE place an order's stock is given back to the products, and the marker that says it has been.
// An order holds its stock exactly when `stockReleasedAt` is empty. Giving it back claims the marker FIRST (an atomic "empty -> now"), so no matter how many things try at once (a failed payment,
// an admin cancelling, a late provider answer) the stock goes back AT MOST ONCE. Always call it inside a transaction: if the stock cannot be put back, the claim is undone with it.
import type { Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient;

/** Gives the order's stock back. Returns whether THIS call did it (false: it had already been given back). */
export async function releaseStock(db: Db, orderId: string, now: Date = new Date()): Promise<boolean> {
  const claimed = await db.order.updateMany({ where: { id: orderId, stockReleasedAt: null }, data: { stockReleasedAt: now } });
  if (claimed.count !== 1) return false;
  const items = await db.orderItem.findMany({ where: { orderId } });
  for (const item of items) await db.product.update({ where: { id: item.productId }, data: { inventory: { increment: item.quantity } } });
  return true;
}

/** The order holds its stock again (it was taken again for a retried payment): clears the marker so a later release works. */
export async function markStockTaken(db: Db, orderId: string): Promise<void> {
  await db.order.updateMany({ where: { id: orderId }, data: { stockReleasedAt: null } });
}
