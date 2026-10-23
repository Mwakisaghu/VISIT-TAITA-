# Shop orders, cancellations and refunds: how it works

For whoever maintains the code. (Staff: see `docs/staff-runbook.md`.)

## Who can do what
Orders hold a customer's name, phone number and delivery address, and cancelling one can lead to money going out, so **everything to do with orders is for admins and super admins only**: the Orders and Refunds-to-send pages, the menu item, and the three actions in `lib/actions/orders-admin.ts`. Each action reads the person from the database every time (`currentManager`), never from the login cookie, and does nothing for an editor, a content manager, a suspended admin or someone who has not yet set up two-step. A customer's own order page is for its buyer or an admin. There is **no other way to change an order's status**: the old `updateOrderStatus` was deleted (a server action can be called by its id even with its button gone), and a test searches for it.

## The stock marker (the important part)
An order **holds its stock exactly when `Order.stockReleasedAt` is empty**. Stock goes back to the products in one place only, `releaseStock` in `lib/order-stock.ts`, which first claims the marker (`empty` to `now`) and only then adds the quantities, inside the caller's transaction. So however many things try at once (a failed payment, an admin cancelling, a late answer from Safaricom) the stock goes back **at most once**. When stock is taken again for a retried payment, `markStockTaken` clears the marker. A migration set the marker for every order whose payment had already failed (those had already given their stock back).

## Cancelling (`cancelOrder` in `lib/order-admin-ops.ts`)
One transaction: claim `status != CANCELLED` to `CANCELLED` (so a double-click or two admins cannot both win), optionally release the stock, write the refund if money is owed, and write the activity log. If any part fails, none of it happens. The customer is emailed afterwards (best effort: an email failure never undoes it). **A cancelled order is final**; its status cannot be changed again.

The refund defaults to what was **confirmed as paid**. A payment the site flagged but could not confirm ("A payment arrived after this order was marked failed", "Amount mismatch") may be refunded up to the order total, but only when an admin asks for an amount: never by default (`refundCeiling` in `lib/order-refunds.ts`).

If a payment is still in flight when an order is cancelled and then arrives, `settlePaid` (in `lib/shop-payments.ts`) leaves the order cancelled, writes the refund for the full amount (once) and emails the customer.

## Refunds
`OrderRefund` is only a **record that money is owed back**. Refunds are sent by hand (M-Pesa, or a card refund in Pesapal) and then recorded with their receipt (`processOrderRefund`): once, atomically; recording one as sent emails the customer. There is no automatic refund through Safaricom or Pesapal.

## Part refunds (`refundOrderPart`)
Refunds part of an order's money and leaves the order as it is. `Order.refundedAmount` is the running total of every refund record on the order (whatever its status); what is left to refund is the ceiling less that (`refundLeft`). A refund claims its room **atomically** (`refundedAmount <= limit - amount`, one conditional update), so two admins refunding at once can never refund more than was paid. Cancelling uses the same left-over: after a part refund its default is what remains. A part refund is also allowed on a cancelled order (orders cancelled before the order tools existed have no refund record).

## Emails
Payment confirmed: `settlePaid` (the one caller that wins the PENDING to PAID claim) sends the confirmation once (what was bought, the total and receipt, pickup or delivery). A cancelled order is never "confirmed": a payment arriving for one gets the late-refund email instead. Also sent: cancelled, part refund, refund sent.

## The menu badge
The Orders menu item and the overview's "Needs your attention" show the number of shop refunds waiting (pending or failed), for admins only (`loadAdminBadges`, key `orderRefunds`).

## Not built
Choosing which items a part refund is for (it is an amount and a reason); an email to the shop owner when an order is paid.
