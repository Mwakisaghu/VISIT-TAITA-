// The text of the "Refunds and cancellations" page. For BOOKINGS it is BUILT FROM the booking rules themselves (lib/booking.ts: the three cancellation policies, the cooling-off rule, the hold and reply times), so
// the page can never say one thing while the system does another: change a rule there and this page follows. For TICKETS and the SHOP it states only what the code really does (a test checks each claim against
// the source). The only things nobody but the owner can decide are the two numbers below.
import { COMMON_RULES, HOLD_MINUTES, PAY_AFTER_ACCEPT_HOURS, POLICIES, REQUEST_RESPONSE_HOURS, type CancellationPolicyKey } from "@/lib/booking";
import type { LegalSection } from "@/lib/legal-text";
import type { SiteInfo } from "@/lib/site-info";

/** OWNER DECISION: how many days after receiving an item (or the day it should have arrived) a customer can report that something is wrong. Change it here and the page follows. */
export const SHOP_PROBLEM_DAYS = 7;
/** How long a refund normally takes once it is agreed. Bookings already promise 3 working days (COMMON_RULES), so the shop says the same: keep the two equal. */
export const REFUND_WORKING_DAYS = 3;

export function refundSections(info: SiteInfo): LegalSection[] {
  const policyLines = (["FLEXIBLE", "MODERATE", "STRICT"] as CancellationPolicyKey[]).map((k) => `**${POLICIES[k].label}:** ${POLICIES[k].lines.join(" ")}`);
  const ask = info.contactEmail ? `To ask for a refund, or if you need any help, write to ${info.contactEmail} or use the contact page.` : "To ask for a refund, or if you need any help, use the contact page.";
  return [
    {
      id: "at-a-glance",
      title: "At a glance",
      body: [
        "Visit Taita brings you together with hosts, organisers and makers. How you get your money back depends on what you bought:",
        { list: [
          "**Experiences and stays booked on this site:** you cancel from your booking, and how much comes back depends on the host's cancellation policy (explained below).",
          "**Event tickets:** you pay the organiser directly, so the organiser decides on any refund and pays it.",
          `**Shop orders:** if something is wrong, tell us within ${SHOP_PROBLEM_DAYS} days and we will work with the seller to put it right.`,
        ] },
      ],
    },
    {
      id: "bookings",
      title: "Experiences and stays you book online",
      body: [
        "Each host chooses one of three cancellation policies. It is shown before you pay, and the policy you saw is the one that applies to your booking, even if the host changes it later.",
        { list: policyLines },
        "Whatever the policy:",
        { list: COMMON_RULES },
        "Holding and paying:",
        { list: [
          `Seats are held for ${HOLD_MINUTES} minutes while you pay. If a host has to accept your request first, they have ${REQUEST_RESPONSE_HOURS} hours to answer, nothing is charged until they accept, and then you have ${PAY_AFTER_ACCEPT_HOURS} hours to pay.`,
          "If you book with a deposit and don't pay the balance by its due date, the booking is cancelled and the deposit is kept.",
        ] },
      ],
    },
    {
      id: "tickets",
      title: "Event tickets",
      body: [
        "Tickets for events are sold by the event organiser. Visit Taita does not take the money for tickets: you pay the organiser directly, in the way they show you when you reserve (for example M-Pesa or a bank transfer), and the organiser confirms your ticket once your payment arrives.",
        { list: [
          "A reservation is held for the time the organiser has set, shown when you reserve. If your payment has not arrived by then, the seats are released and the reservation expires.",
          "Because the organiser holds the money, **the organiser decides on any refund and pays it.** If an event is cancelled or changed, ask the organiser first. If you can't reach them, or don't get an answer, write to us and we will help you get one.",
          "A ticket that has already been used at the door cannot be cancelled.",
        ] },
      ],
    },
    {
      id: "shop",
      title: "Shop orders",
      body: [
        "Items are sold by the seller named on each product. You pay by M-Pesa or Pesapal at checkout, and an order is confirmed when the payment succeeds. At checkout you choose local pickup or shipping, and the seller uses the phone number and address you give to arrange it.",
        { list: [
          "**If you were charged but your order could not go ahead** (for example the item had sold out, or your payment arrived after the order had timed out), we check it and either complete your order or refund you in full.",
          `**If something is wrong with what you received** (it is damaged, it is not what the product page described, or it never arrived), contact us within ${SHOP_PROBLEM_DAYS} days of receiving it, or of the day it should have arrived. We will work with the seller to put it right: a replacement, a repair or a refund.`,
          "**If you simply change your mind:** many items are handmade by people in Taita, often made to order, so we cannot promise to take back unused goods. If you are unsure, ask the seller before you buy.",
          `Shop refunds go back to the M-Pesa number or card you paid with. We send M-Pesa refunds by hand, normally within ${REFUND_WORKING_DAYS} working days of agreeing the refund.`,
        ] },
      ],
    },
    {
      id: "help",
      title: "Asking for help",
      body: [
        `${ask} Please include your booking, ticket or order number.`,
        "Nothing on this page limits any rights you have under Kenyan consumer law.",
      ],
    },
  ];
}
