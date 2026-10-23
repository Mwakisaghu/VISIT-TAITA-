# Staff runbook: when something needs a person

For the people who look after Visit Taita day to day. Each part says **what you see**, **what to do**, and **what not to do**. When you are unsure, do not guess: write down what you see (who, when, the booking, ticket or order number) and ask. Everything here was written from what the admin pages and the code actually do; where the site has **no tool** for something, it says so and gives the manual way.

Three rules that apply to money:
1. **A payment only counts once Safaricom or Pesapal has confirmed it to the site itself.** The site never takes anyone's word for it (not the guest's, not a screenshot, not ours), so there is no button to mark something paid by hand. This protects you from fake receipts.
2. **Every refund and payout you send by hand is recorded with its M-Pesa receipt.** The site keeps that record for booking refunds, shop refunds and host payouts.
3. **Nothing is sent to a customer until you have the receipt in your hand.** Check the M-Pesa statement, not the customer's message.

## Who can do what
| Job | Super admin, Admin | Editor, Content manager |
| --- | --- | --- |
| Bookings, shop orders (see them, change them, cancel them), every refund, host payouts, accounts, the activity log | Yes | **No** (these pages send them back to the admin home) |
| Stories, places, events, products and the rest of the content | Yes | Yes |

## 1. A guest says they paid for an experience or stay, but the booking isn't confirmed
**How it works.** Seats are held for 30 minutes while the guest pays. A payment is confirmed when Safaricom or Pesapal tells the site it arrived and for the right amount. The guest's page re-checks while it is open, and the scheduled job (it should run every five minutes: your launch checklist says so) resolves payments whose message was missed.

**What to do.**
1. Ask for the M-Pesa receipt and the time. Open **Bookings & refunds**, find the booking (search by eye: the list shows who, how many, the status, and "paid KES x of y").
2. Wait up to ten minutes and look again: most are the message arriving late.
3. If the guest paid **after the 30-minute hold ran out**, the site refunds it rather than confirming a booking that no longer holds seats: it emails the guest and it appears under **Refunds to send**. Send it as in part 2.
4. If the amount sent is **different** from what was due, the site will not confirm it. Do not try to fix it by hand: refund the guest as in part 2 or by M-Pesa, and ask them to book again.
5. If Safaricom's own statement shows the money arrived but the booking never confirmed after thirty minutes: refund the guest by hand from your M-Pesa, ask them to book again if seats remain, write it down, and tell the developer (it means a message was lost and the cause should be found).

**Do not** promise a seat to someone whose booking is not confirmed, and do not ask them to pay a second time before the first is sorted out.

## 2. Cancel a booking and refund it (admins only)
1. **Bookings & refunds**, find the booking, open **Cancel…** and give a short reason (3 to 200 characters). Tick the full-refund box **only** for illness, a death or a disaster: it overrides the host's cancellation policy. Otherwise the policy decides how much comes back (see the Refunds and cancellations page of the site).
2. The site cancels, works out the refund and emails the guest. The message tells you the amount ("Cancelled. KES … to refund.").
3. Open **Refunds to send** (a button on the Bookings page, with the number waiting). For each refund: **send the M-Pesa refund by hand**, then record it as **Sent** with the M-Pesa receipt (4 to 40 letters and numbers). The guest is emailed that it was sent.
4. If you cannot send it, record it as **Failed** and write what went wrong (at least three characters). It stays in the list so it is not forgotten. A refund recorded as sent cannot be changed.

## 3. A shop order: paid but waiting, a late payment, or a customer wants money back (admins only)
**Paid but still "Waiting for M-Pesa confirmation".** The shop re-checks with Safaricom only while the customer's own order page is open (and when a message arrives). Ask the customer to open their order again and stay on the page for a minute. There is **no scheduled job for shop orders**.

**The Orders list shows a payment as failed with "A payment arrived after this order was marked failed" or "Amount mismatch".** The site could not confirm it, but money may have been taken. Look at the M-Pesa receipt in the reason, check it on your M-Pesa statement, then:
- **To fulfil it:** the product's stock was given back when the order failed, so first open **Products**, edit the product and check its **Inventory** (the list shows "n in stock"); take the item off by hand. Set the order to **Confirmed**, and later **Fulfilled**. The payment line will still say failed: that is expected.
- **To refund it:** open **Cancel order…** on that order. The refund box starts at 0 (the site has not confirmed the payment, so it never refunds it by default); type what you saw arrive, up to the order total. The stock is already back on the shelf, and the form says so.

**To cancel an order, or give a customer their money back** (a change of mind, damaged, not as described, never arrived: see the Refunds and cancellations page of the site for what we promised), open **Cancel order…** on the order:
1. Give a short reason (3 to 200 characters). The customer is emailed it.
2. **Refund (KES)** starts at what was paid. Lower it for a partial refund, or type 0 for none. It can never be more than was paid.
3. **Put the items back in stock:** tick it when they can be sold again; leave it unticked when they are broken or lost (for an order already fulfilled it starts unticked). Stock is only ever put back once.
4. Tick **I understand this cannot be undone**, and cancel. The site cancels the order, records the refund, puts the stock back if you asked, emails the customer, and writes it all to the activity log.
5. Open **Refunds to send** (a button on the Orders page, with the number waiting). **Send the M-Pesa refund by hand** (or refund the card payment in your Pesapal account), then record it as **Sent** with the M-Pesa receipt (4 to 40 letters and numbers): the customer is emailed. If you cannot send it, record it as **Failed** with a note: it stays in the list.

If a payment was still in progress when you cancelled and then arrives, the order stays cancelled and the site writes the refund for you and emails the customer: you will find it in **Refunds to send**.

> **Cancelled is final.** A cancelled order cannot be reopened, and its status cannot be changed afterwards. To refund only part of an order **and keep the rest of it**, there is no button yet: send that refund by hand and write it in your sheet (the table at the end). Orders cancelled before this update were only labelled: their stock was never put back and no refund was recorded for them.

## 4. Host payouts (admins only)
Guests pay Visit Taita; hosts are paid afterwards. Open **Host payouts**:
1. **Commission and holding period** shows the percentage kept and how many days earnings are held after an experience.
2. **Ready to prepare** lists hosts with money that can be paid now. Use **Prepare** for one host or for all. A host with no valid payout number is skipped and named: ask them to add one on their Payouts page.
3. **To send** lists the prepared payouts with the amount and the M-Pesa number. **Send each by M-Pesa by hand**, then record it as **Sent** with the M-Pesa receipt (4 to 40 letters and numbers), or **Cancel** it with a reason (that releases its bookings for the next payout).
4. **Recently processed** shows the last twenty; the **Activity log** shows who prepared and recorded each one. Two people clicking at once cannot pay the same booking twice.

## 5. Event tickets
The **organiser** is paid directly by the guest and decides on any refund (see the Refunds and cancellations page of the site). The organiser confirms a payment with its reference, and can cancel tickets and tell the guest. A reservation nobody confirms in time is released automatically, and a ticket already used at the door cannot be cancelled. If an organiser does not answer a guest, ask them yourself; do not refund a ticket from Visit Taita's money.

## 6. Someone cannot sign in because of two-step
Lost phone and lost recovery codes: follow `docs/two-step.md` ("When someone is locked out"). Check who is asking before you reset anyone.

## 7. Emails are not arriving
Open **Email log**. A banner at the top says whether email is set up, whether the shared test sender is still in use (it only delivers to one address) and whether the retry job is on; failed emails are listed with the provider's reason and are retried. If a guest says they got nothing, look for their address in the list first.

## 8. A privacy request, or a possible leak of data
Most people can do it themselves: **Download my data** and **Delete my account** are on their account page. For anything else follow `docs/data-protection.md` part 5, and keep a note of the request and what you did. If you think personal data has been seen by someone who should not have seen it, **stop and read part 4 of the same guide straight away**: it has deadlines.

## 9. Take something down
Open the item (a story, place, event, product...), set its **Status** to Draft and save: it disappears from the public site at once. Do this first, think afterwards, and put it back when it is sorted.

## 10. The site is broken
1. Was something just changed? In Netlify, Deploys, then "Publish deploy" on the last good one: instant, no code change (`docs/nextjs-upgrade.md`).
2. Is Neon (the database) or Netlify having a problem? Check their status pages. If so, there is nothing to fix: tell visitors on your social channels.
3. Write down the time, the page and what you see, and tell the developer.

## Who to call (fill this in once, and keep it where two people can find it)
| For | Name | Phone and email | If they cannot be reached |
| --- | --- | --- | --- |
| The developer | ______ | ______ | ______ |
| The Netlify account | ______ | ______ | ______ |
| The Neon account (database) | ______ | ______ | ______ |
| The domain and its DNS | ______ | ______ | ______ |
| Safaricom (M-Pesa) | ______ | ______ | ______ |
| Pesapal (cards) | ______ | ______ | ______ |
| Your lawyer | ______ | ______ | ______ |

## Your record of manual money actions
The site records booking refunds, shop refunds and host payouts itself. It does **not** record money you send outside it, for example refunding part of an order while keeping the rest, or refunding a payment the site never saw, and those should never be only in someone's memory. Keep one simple sheet:

| Date | Order, booking or payout | Amount (KES) | M-Pesa receipt | Why | Done by |
| --- | --- | --- | --- | --- | --- |
| ______ | ______ | ______ | ______ | ______ | ______ |
