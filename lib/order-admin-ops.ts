// What an admin can do to a shop order, as database operations: change its status, cancel it (with a reason, an optional refund and an optional return of the stock to the shelf), and record that a refund
// was sent. NOT a "use server" file: server actions are public endpoints, and these must only ever be reached through lib/actions/orders-admin.ts, which checks for an admin first.
//
// Every operation is ONE transaction that also writes the activity log, so an entry exists exactly when the thing happened. Every change that must happen once is an atomic claim (`status != CANCELLED`
// -> CANCELLED, `refund PENDING -> SENT`, `stockReleasedAt empty -> now`), so two admins clicking at once, or a double-click, can never cancel twice, refund twice or put the stock back twice.
import type { PrismaClient } from "@prisma/client";
import { releaseStock } from "@/lib/order-stock";
import { createRefund, paidAmount, paymentUnconfirmed, refundCeiling } from "@/lib/order-refunds";
import { notifyOrder } from "@/lib/order-emails";

export type Actor = { id: string; email: string };
export type Failure = { ok: false; error: string };
const no = (error: string): Failure => ({ ok: false, error });
const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");
const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
const RECEIPT = /^[A-Za-z0-9 -]{4,40}$/;
const CHANGED = "This order was just changed by someone else. Reload the page and look again.";
const FAILED_OP = "Something went wrong and nothing was changed. Please try again.";

/** The statuses an admin may move an order between by hand. Cancelling is deliberately NOT here: it has its own form. */
export const MANUAL_STATUSES = ["PENDING", "CONFIRMED", "FULFILLED"] as const;

export type CancelOk = { ok: true; refund: number; refundId: string | null; restocked: boolean; stockNote: string; inFlight: boolean };

export async function cancelOrder(db: PrismaClient, input: { orderId: unknown; reason: unknown; refundAmount?: unknown; restock: unknown; actor: Actor }, now: Date = new Date()): Promise<CancelOk | Failure> {
  const why = clean(input.reason, 200);
  if (why.length < 3) return no("Give a short reason (3 to 200 characters).");
  const restock = input.restock === true;
  const orderId = String(input.orderId);
  let done: CancelOk | Failure;
  try {
    done = await db.$transaction(async (tx): Promise<CancelOk | Failure> => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { buyer: { select: { id: true, email: true } } } });
      if (!order) return no("That order was not found.");
      if (order.status === "CANCELLED") return no("This order is already cancelled.");
      const ceiling = refundCeiling(order);
      let refund = paidAmount(order); // by default exactly what was CONFIRMED as paid: money the site could not confirm is only ever refunded when an admin asks for it
      const asked = input.refundAmount;
      if (asked !== undefined && asked !== null && asked !== "") {
        const n = typeof asked === "number" ? asked : Number(asked);
        if (!Number.isInteger(n) || n < 0) return no("The refund must be a whole number of shillings, 0 or more.");
        if (n > ceiling) return no(ceiling === 0 ? "Nothing has been paid on this order, so there is nothing to refund." : `The refund cannot be more than the order total (${kes(ceiling)}).`);
        refund = n;
      }
      const claimed = await tx.order.updateMany({ where: { id: order.id, status: { not: "CANCELLED" } }, data: { status: "CANCELLED", cancelledAt: now, cancelReason: why, cancelledById: input.actor.id } });
      if (claimed.count !== 1) return no(CHANGED);
      let restocked = false; let stockNote = "The stock was left as it is.";
      if (restock) { restocked = await releaseStock(tx, order.id, now); stockNote = restocked ? "The items are back in stock." : "The stock had already been put back, so nothing was added."; }
      let refundId: string | null = null;
      if (refund > 0) refundId = (await createRefund(tx, { orderId: order.id, amount: refund, reason: `Order cancelled: ${why}`, createdById: input.actor.id })).id;
      await tx.adminAuditLog.create({ data: { actorId: input.actor.id, actorEmail: input.actor.email, action: "order.cancel", targetUserId: order.buyer?.id ?? null, targetEmail: order.buyer?.email ?? null, detail: `order ${order.orderNumber}: ${why}; refund ${kes(refund)}; ${restocked ? "stock put back" : "stock not put back"}`.slice(0, 300) } });
      return { ok: true, refund, refundId, restocked, stockNote, inFlight: order.paymentStatus === "PENDING" && !paymentUnconfirmed(order) };
    });
  } catch (e) { console.error("[orders] cancel failed:", (e as Error).message); return no(FAILED_OP); }
  if (done.ok) await notifyOrder(orderId, { kind: "cancelled", refund: done.refund, inFlight: done.inFlight });
  return done;
}

export async function setOrderStatus(db: PrismaClient, input: { orderId: unknown; status: unknown; actor: Actor }): Promise<{ ok: true; changed: boolean } | Failure> {
  const status = typeof input.status === "string" ? input.status : "";
  if (status === "CANCELLED") return no("To cancel an order use \"Cancel order\": it asks for a reason and deals with the refund and the stock.");
  if (!(MANUAL_STATUSES as readonly string[]).includes(status)) return no("Choose Pending, Confirmed or Fulfilled.");
  try {
    return await db.$transaction(async (tx): Promise<{ ok: true; changed: boolean } | Failure> => {
      const order = await tx.order.findUnique({ where: { id: String(input.orderId) }, include: { buyer: { select: { id: true, email: true } } } });
      if (!order) return no("That order was not found.");
      if (order.status === "CANCELLED") return no("A cancelled order cannot be reopened.");
      if (order.status === status) return { ok: true, changed: false };
      const claimed = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: status as (typeof MANUAL_STATUSES)[number] } });
      if (claimed.count !== 1) return no(CHANGED);
      await tx.adminAuditLog.create({ data: { actorId: input.actor.id, actorEmail: input.actor.email, action: "order.status", targetUserId: order.buyer?.id ?? null, targetEmail: order.buyer?.email ?? null, detail: `order ${order.orderNumber}: ${order.status} to ${status}`.slice(0, 300) } });
      return { ok: true, changed: true };
    });
  } catch (e) { console.error("[orders] status change failed:", (e as Error).message); return no(FAILED_OP); }
}

/** Records the outcome of a refund that was sent by hand. SENT needs the receipt; FAILED needs a note. Only a refund that is still waiting (or failed earlier) can be recorded, and only once. */
export async function processOrderRefund(db: PrismaClient, input: { refundId: unknown; outcome: unknown; reference: unknown; note: unknown; actor: Actor }, now: Date = new Date()): Promise<{ ok: true; outcome: "SENT" | "FAILED" } | Failure> {
  const outcome = input.outcome;
  if (outcome !== "SENT" && outcome !== "FAILED") return no("Choose sent or failed.");
  const ref = typeof input.reference === "string" ? input.reference.trim() : "";
  const note = clean(input.note, 300);
  if (outcome === "SENT" && !RECEIPT.test(ref)) return no("Enter the M-Pesa receipt (or card refund reference): 4 to 40 letters and numbers.");
  if (outcome === "FAILED" && note.length < 3) return no("Say what went wrong, so it can be put right.");
  const refundId = String(input.refundId);
  let sent: { orderId: string; amount: number; reference: string | null } | null = null;
  try {
    const r = await db.$transaction(async (tx): Promise<{ ok: true } | Failure> => {
      const claimed = await tx.orderRefund.updateMany({ where: { id: refundId, status: { in: ["PENDING", "FAILED"] } }, data: { status: outcome, reference: ref || null, note: note || null, processedAt: now, processedById: input.actor.id } });
      if (claimed.count !== 1) return no("This refund has already been recorded.");
      const row = await tx.orderRefund.findUnique({ where: { id: refundId }, select: { orderId: true, amount: true, reference: true, order: { select: { orderNumber: true, buyerId: true } } } });
      await tx.adminAuditLog.create({ data: { actorId: input.actor.id, actorEmail: input.actor.email, action: `order.refund.${outcome.toLowerCase()}`, targetUserId: row?.order?.buyerId ?? null, detail: `order ${row?.order?.orderNumber ?? ""}: ${kes(row?.amount ?? 0)}${outcome === "SENT" ? `, receipt ${ref}` : `, failed: ${note}`}`.slice(0, 300) } });
      if (outcome === "SENT" && row) sent = { orderId: row.orderId, amount: row.amount, reference: row.reference };
      return { ok: true };
    });
    if (!r.ok) return r;
  } catch (e) { console.error("[orders] refund record failed:", (e as Error).message); return no(FAILED_OP); }
  if (sent) { const s = sent as { orderId: string; amount: number; reference: string | null }; await notifyOrder(s.orderId, { kind: "refundSent", amount: s.amount, reference: s.reference }); }
  return { ok: true, outcome };
}
