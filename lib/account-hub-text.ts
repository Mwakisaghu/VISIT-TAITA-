// What each part of the account page SAYS and where it LINKS. Every sentence goes through tr(), so it appears in the person's language.
// A text with a count has a separate sentence for "1" and for "more" (languages differ in how they change the noun), so a count is never glued onto a noun.
import { getLocale, lp, tr } from "@/lib/i18n/server";
import { formatDayTime, formatLong, isNewMember, type OrderState } from "@/lib/account-hub-rules";
import type { AccountHub, ComingItem } from "@/lib/account-hub";
import type { IconName } from "@/components/account-hub/Icon";
import type { Locale } from "@/lib/i18n/config";

const TAG: Record<Locale, string> = { en: "en-GB", sw: "sw-KE", fr: "fr-FR", de: "de-DE" };
export const ksh = (n: number, l: Locale = getLocale()) => `KSh ${new Intl.NumberFormat(TAG[l]).format(n)}`;
const join = (parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(", ");
export const firstName = (name: string) => (name.trim().split(/\s+/)[0] || name).slice(0, 40);

export type Tile = { key: string; title: string; status: string; href: string; icon: IconName };
export type Chip = { text: string; tone: "good" | "info" | "warn" };
export type ComingCard = { key: string; kicker: string; chip: Chip; title: string; detail: string; action: { label: string; href: string } };
export type Attention = { key: "verify" | "requests" | "payout" | "payment"; title: string; body: string; action?: { label: string; href: string } };

export function greeting(h: AccountHub, now = new Date()) {
  const name = firstName(h.user.name);
  return isNewMember(h.user.createdAt, now) ? tr("Karibu, {name}.", { name }) : tr("Karibu tena, {name}.", { name });
}

export function tiles(h: AccountHub): Tile[] {
  const stamps = h.ribbon.total, wishes = h.wishes.length;
  const passport = join([
    stamps === 0 ? tr("No stamps yet") : stamps === 1 ? tr("1 stamp") : tr("{n} stamps", { n: stamps }),
    wishes === 1 ? tr("1 place you want to go") : wishes > 1 ? tr("{n} places you want to go", { n: wishes }) : "",
  ]);
  const b = h.bookings, bookings = b.upcoming + b.past === 0 ? tr("Nothing booked yet") : join([b.upcoming > 0 && tr("{n} coming up", { n: b.upcoming }), b.past > 0 && tr("{n} past", { n: b.past })]);
  const tk = h.tickets, tickets = tk.valid > 0 ? (tk.valid === 1 ? tr("1 valid ticket") : tr("{n} valid tickets", { n: tk.valid })) : tk.upcoming > 0 ? tr("Waiting for payment") : tk.total > 0 ? tr("Nothing coming up") : tr("No tickets yet");
  const o = h.orders, orders = o.open > 0 ? tr("{n} in progress", { n: o.open }) : o.total === 1 ? tr("1 order") : o.total > 1 ? tr("{n} orders", { n: o.total }) : tr("No orders yet");
  const plans = h.plans === 0 ? tr("Plan your first day") : h.plans === 1 ? tr("1 saved plan") : tr("{n} saved plans", { n: h.plans });
  const want = wishes === 0 ? tr("Save places for later") : wishes === 1 ? tr("1 place saved") : tr("{n} places saved", { n: wishes });
  const e = h.enquiries, enquiries = e.waiting > 0 ? tr("{n} waiting for a reply", { n: e.waiting }) : e.total === 1 ? tr("1 enquiry sent") : e.total > 1 ? tr("{n} enquiries sent", { n: e.total }) : tr("No enquiries yet");
  const r = h.reviews, writing = join([r.total === 1 ? tr("1 review") : r.total > 1 && tr("{n} reviews", { n: r.total }), h.notes === 1 ? tr("1 Field Note") : h.notes > 1 && tr("{n} Field Notes", { n: h.notes })]);
  const reviews = writing || (h.user.emailVerifiedAt ? tr("Nothing written yet") : tr("Verify your email first"));
  const rw = h.rewards, rewards = rw.vouchers > 0 ? (rw.vouchers === 1 ? tr("1 voucher ready to use") : tr("{n} vouchers ready to use", { n: rw.vouchers })) : rw.ready > 0 ? (rw.ready === 1 ? tr("1 reward ready to claim") : tr("{n} rewards ready to claim", { n: rw.ready })) : tr("Earn rewards as you explore");
  return [
    { key: "passport", title: tr("Passport"), status: passport, href: lp("/passport"), icon: "passport" },
    { key: "bookings", title: tr("Bookings"), status: bookings, href: lp("/account/bookings"), icon: "booking" },
    { key: "tickets", title: tr("Tickets"), status: tickets, href: lp("/account/tickets"), icon: "ticket" },
    { key: "orders", title: tr("Orders"), status: orders, href: lp("/account/orders"), icon: "order" },
    { key: "plans", title: tr("Day plans"), status: plans, href: lp("/plan"), icon: "plan" },
    { key: "want", title: tr("Want to go"), status: want, href: lp("/passport") + "#want-to-go", icon: "pin" },
    { key: "enquiries", title: tr("Enquiries"), status: enquiries, href: lp("/account/enquiries"), icon: "chat" },
    { key: "reviews", title: tr("Reviews and Field Notes"), status: reviews, href: lp("/account/reviews"), icon: "review" },
    { key: "rewards", title: tr("Rewards"), status: rewards, href: lp("/passport/rewards"), icon: "gift" },
  ];
}

const ORDER_CHIP: Record<OrderState, () => Chip> = {
  awaiting_payment: () => ({ text: tr("Payment needed"), tone: "warn" }),
  payment_failed: () => ({ text: tr("Payment failed"), tone: "warn" }),
  paid: () => ({ text: tr("Paid"), tone: "good" }),
  preparing: () => ({ text: tr("Being prepared"), tone: "info" }),
  done: () => ({ text: tr("Completed"), tone: "good" }),
  cancelled: () => ({ text: tr("Cancelled"), tone: "warn" }),
};
const guests = (n: number) => (n === 1 ? tr("1 guest") : tr("{n} guests", { n }));
const ticketsN = (n: number) => (n === 1 ? tr("1 ticket") : tr("{n} tickets", { n }));

export const orderChip = (state: OrderState): Chip => ORDER_CHIP[state]();
export function enquiryChip(status: string): Chip {
  return status === "NEW" ? { text: tr("Waiting for a reply"), tone: "info" } : status === "CONTACTED" ? { text: tr("The host has been in touch"), tone: "good" } : status === "CONFIRMED" ? { text: tr("Confirmed"), tone: "good" } : { text: tr("Declined"), tone: "warn" };
}
export function reviewChip(status: string): Chip {
  return status === "APPROVED" ? { text: tr("Published"), tone: "good" } : status === "REJECTED" ? { text: tr("Not published"), tone: "warn" } : { text: tr("Waiting for approval"), tone: "info" };
}
export function noteChip(status: string): Chip {
  return status === "APPROVED" ? { text: tr("Published"), tone: "good" } : status === "CHANGES_REQUESTED" ? { text: tr("Changes requested"), tone: "warn" } : status === "HIDDEN" ? { text: tr("Hidden"), tone: "warn" } : { text: tr("Waiting for review"), tone: "info" };
}
export function comingCards(h: AccountHub): ComingCard[] {
  const l = getLocale();
  return h.comingUp.map((c: ComingItem): ComingCard => {
    if (c.kind === "booking") {
      const chip: Chip = c.status === "CONFIRMED" ? { text: tr("Confirmed"), tone: "good" } : c.status === "REQUESTED" ? { text: tr("Waiting for the host"), tone: "info" } : { text: tr("Payment needed"), tone: "warn" };
      return { key: "booking-" + c.id, kicker: tr("Booking"), chip, title: c.name, detail: tr("{when}. {guests}.", { when: formatDayTime(c.startsAt, l), guests: guests(c.guests) }), action: { label: tr("View booking"), href: lp(`/bookings/${c.id}`) } };
    }
    if (c.kind === "tickets") {
      const paid = c.status === "VALID";
      return { key: "tickets-" + c.id, kicker: tr("Tickets"), chip: paid ? { text: tr("Valid"), tone: "good" } : { text: tr("Waiting for payment"), tone: "warn" }, title: c.name, detail: paid ? tr("{when}. {tickets}. Show the QR code at the door.", { when: formatDayTime(c.eventDate, l), tickets: ticketsN(c.live) }) : tr("{when}. {tickets}. Finish paying to keep them.", { when: formatDayTime(c.eventDate, l), tickets: ticketsN(c.live) }), action: { label: tr("Show my tickets"), href: lp(`/tickets/${c.id}`) } };
    }
    const what = c.firstItem ? (c.otherItems === 0 ? c.firstItem : c.otherItems === 1 ? tr("{item} and 1 other item", { item: c.firstItem }) : tr("{item} and {n} other items", { item: c.firstItem, n: c.otherItems })) : tr("Your order");
    return { key: "order-" + c.id, kicker: tr("Order"), chip: ORDER_CHIP[c.state](), title: tr("Taita Made, order {number}", { number: c.orderNumber }), detail: tr("{what}, {amount}.", { what, amount: ksh(c.totalAmount, l) }), action: { label: tr("Track this order"), href: lp(`/shop/orders/${c.id}`) } };
  });
}

/** Things that need the person to do something, most important first. */
export function attention(h: AccountHub): Attention[] {
  const out: Attention[] = [];
  if (!h.user.emailVerifiedAt) out.push({ key: "verify", title: tr("Verify your email address"), body: tr("We sent a link to {email}. Until you open it, you cannot write reviews or apply to the Field Crew.", { email: h.user.email }) });
  const failed = h.comingUp.find((c) => c.kind === "order" && c.state === "payment_failed");
  if (failed && failed.kind === "order") out.push({ key: "payment", title: tr("Your payment for order {number} did not go through", { number: failed.orderNumber }), body: tr("The payment was not completed. Open the order to try again."), action: { label: tr("Open the order"), href: lp(`/shop/orders/${failed.id}`) } });
  if (h.host && h.host.pendingRequests > 0) out.push({ key: "requests", title: h.host.pendingRequests === 1 ? tr("1 booking request is waiting for you") : tr("{n} booking requests are waiting for you", { n: h.host.pendingRequests }), body: tr("Guests are waiting for an answer. Accept or decline each request."), action: { label: tr("Review the requests"), href: lp("/partner/bookings") } });
  if (h.host?.payoutPending) out.push({ key: "payout", title: tr("{amount} is waiting to be sent to you", { amount: ksh(h.host.payoutPending.amount) }), body: tr("It is being prepared for your M-Pesa number."), action: { label: tr("See payout details"), href: lp("/partner/payouts") } });
  return out;
}

/** "Your work": only for people with a role on Visit Taita. */
export function workBand(h: AccountHub): { title: string; intro: string; tiles: Tile[] } | null {
  if (h.work.length === 0) return null;
  const t: Tile[] = [];
  if (h.work.includes("host")) {
    const x = h.host!;
    t.push(
      { key: "host", title: tr("Host dashboard"), status: x.liveListings === 1 ? tr("1 listing live") : x.liveListings > 1 ? tr("{n} listings live", { n: x.liveListings }) : tr("Your stays and experiences"), href: lp("/partner"), icon: "home" },
      { key: "host-bookings", title: tr("Bookings you host"), status: x.pendingRequests === 1 ? tr("1 request waiting") : x.pendingRequests > 1 ? tr("{n} requests waiting", { n: x.pendingRequests }) : tr("No requests waiting"), href: lp("/partner/bookings"), icon: "booking" },
      { key: "host-enquiries", title: tr("Enquiries you receive"), status: x.newEnquiries === 1 ? tr("1 new enquiry") : x.newEnquiries > 1 ? tr("{n} new enquiries", { n: x.newEnquiries }) : tr("No new enquiries"), href: lp("/partner/enquiries"), icon: "chat" },
      { key: "host-payouts", title: tr("Payouts"), status: x.payoutPending ? tr("{amount} waiting to be sent", { amount: ksh(x.payoutPending.amount) }) : tr("Nothing waiting"), href: lp("/partner/payouts"), icon: "cash" },
    );
  }
  if (h.work.includes("seller")) t.push({ key: "seller", title: tr("Your products"), status: tr("What you sell in the shop"), href: lp("/partner/products"), icon: "shop" });
  if (h.work.includes("events")) t.push({ key: "events", title: tr("Your events"), status: tr("Events and their tickets"), href: lp("/partner/events"), icon: "mic" });
  if (h.work.includes("creator")) t.push({ key: "creator", title: tr("Missions"), status: tr("Find a mission to take on"), href: lp("/missions"), icon: "review" }, { key: "crew", title: tr("The Field Crew"), status: tr("Your creator work"), href: lp("/crew"), icon: "pin" });
  if (h.work.includes("admin")) t.push({ key: "admin", title: tr("Admin"), status: tr("Run the site"), href: "/admin", icon: "key" });
  return { title: tr("Your work"), intro: tr("Only people with a role on Visit Taita see this section."), tiles: t };
}

/** Everything linked to the account, as short labels. */
export function heldChips(h: AccountHub): string[] {
  const out: string[] = [];
  const s = h.ribbon.total; if (s) out.push(s === 1 ? tr("1 Passport stamp") : tr("{n} Passport stamps", { n: s }));
  const w = h.wishes.length; if (w) out.push(w === 1 ? tr("1 want-to-go place") : tr("{n} want-to-go places", { n: w }));
  if (h.plans) out.push(h.plans === 1 ? tr("1 day plan") : tr("{n} day plans", { n: h.plans }));
  if (h.enquiries.total) out.push(h.enquiries.total === 1 ? tr("1 enquiry") : tr("{n} enquiries", { n: h.enquiries.total }));
  if (h.reviews.total) out.push(h.reviews.total === 1 ? tr("1 review") : tr("{n} reviews", { n: h.reviews.total }));
  if (h.notes) out.push(h.notes === 1 ? tr("1 Field Note") : tr("{n} Field Notes", { n: h.notes }));
  if (h.orders.total) out.push(h.orders.total === 1 ? tr("1 order") : tr("{n} orders", { n: h.orders.total }));
  const bt = h.bookings.upcoming + h.bookings.past; if (bt) out.push(bt === 1 ? tr("1 booking") : tr("{n} bookings", { n: bt }));
  if (h.tickets.total) out.push(h.tickets.total === 1 ? tr("1 ticket order") : tr("{n} ticket orders", { n: h.tickets.total }));
  return out;
}
export { formatLong };
