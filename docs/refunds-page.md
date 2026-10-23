# The Refunds and cancellations page (/refunds)

A customer-facing page that says what you get back, and how to ask, for everything sold on Visit Taita. It is linked from the footer, the booking panel, the shop checkout and the ticket reservation.

## Where the words come from
- **Bookings (experiences and stays):** built from the booking rules themselves (`lib/booking.ts`): the three cancellation policies, the common rules, and the hold, reply and payment times. Change a rule there and the page follows. Tests check the printed words against what the system actually does at every boundary.
- **Event tickets:** you pay the **organiser** directly (M-Pesa, bank transfer or another way they show). Visit Taita never holds ticket money, so the organiser decides on and pays any refund; we help if they don't answer. A test fails if a payment gateway is ever added to the ticket code, so this page cannot go stale unnoticed.
- **Shop:** what the code really does: M-Pesa or Pesapal, local pickup or shipping, and a payment that arrives for an order that could not go ahead is checked and then completed or refunded. **Shop refunds are recorded** (Orders, then Refunds to send): an admin cancels the order, the refund is written down as owed, a person sends it by hand and records the receipt, and the customer is emailed. The page says refunds are sent by hand. A test fails if an automatic refund through Safaricom or Pesapal is ever added, as a reminder to update the page.

## Two decisions only you can make (`lib/refund-policy.ts`)
- `SHOP_PROBLEM_DAYS` (now 7): how many days a customer has to report that something is wrong with an order.
- `REFUND_WORKING_DAYS` (now 3): how long a shop refund normally takes. It matches what bookings already promise; a test keeps the two equal.
- The shop's "change of mind" line says unused goods may not be taken back (many items are handmade, often to order). Change that sentence in the same file if you decide otherwise.

## Before you launch
The page shows the same "draft, pending legal review" notice as your other legal pages until a lawyer has approved it. Have them read it, especially the last line ("nothing on this page limits any rights you have under Kenyan consumer law"), the ticket section (you are telling customers the organiser, not Visit Taita, handles refunds) and the shop's change-of-mind line.

## Not built
(Nothing is pending for shop refunds: a part refund, a full refund by cancelling, and late payments are all recorded.)
