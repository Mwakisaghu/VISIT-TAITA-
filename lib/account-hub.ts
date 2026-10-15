// Everything the account page shows, gathered in one place. EVERY query here is scoped to the one person (or to the listings they own); a test checks that.
import { prisma } from "@/lib/prisma";
import { getDeletionBlockers } from "@/lib/account-data";
import { bookingBuckets, enquiryWaiting, isOpenOrder, nextToStamp, orderState, ribbonOf, rewardsReady, ticketGroups, workKinds, type OrderState, type Stamp, type WorkKind } from "@/lib/account-hub-rules";

export type ComingItem =
  | { kind: "booking"; id: string; name: string; startsAt: Date; guests: number; status: string }
  | { kind: "tickets"; id: string; name: string; eventDate: Date; live: number; status: string }
  | { kind: "order"; id: string; orderNumber: string; totalAmount: number; state: OrderState; firstItem: string | null; otherItems: number };

export type HostStats = { liveListings: number; pendingRequests: number; newEnquiries: number; payoutPending: { amount: number; count: number } | null };

export type AccountHub = {
  user: { id: string; name: string; email: string; role: string; createdAt: Date; emailVerifiedAt: Date | null; termsAcceptedAt: Date | null; termsVersion: string | null; points: number; payoutPhone: string | null };
  ribbon: ReturnType<typeof ribbonOf>;
  wishes: { id: string; slug: string; name: string }[];
  next: { id: string; slug: string; name: string } | null;
  bookings: { upcoming: number; past: number };
  tickets: { upcoming: number; valid: number; total: number };
  orders: { total: number; open: number };
  plans: number;
  enquiries: { total: number; waiting: number };
  reviews: { total: number; pending: number };
  notes: number;
  rewards: { ready: number; vouchers: number };
  comingUp: ComingItem[];
  work: WorkKind[];
  host: HostStats | null;
  subscriber: { status: string; confirmedAt: Date | null } | null;
  blockers: string[];
};

/** The page needs the person's account; null if it has gone. */
export async function loadAccountHub(userId: string, now: Date = new Date()): Promise<AccountHub | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true, createdAt: true, emailVerifiedAt: true, termsAcceptedAt: true, termsVersion: true, points: true, payoutPhone: true } });
  if (!user) return null;
  const mine = { userId: user.id };
  const [visits, wishRows, bookingRows, ticketRows, orderRows, plans, expEnq, accEnq, reviewRows, notes, rewardRows, vouchers, subscriber, blockers, ownedExp, ownedAcc] = await Promise.all([
    prisma.visit.findMany({ where: mine, select: { destination: { select: { id: true, name: true, altitudeM: true } } } }),
    prisma.placeWish.findMany({ where: { ...mine, destination: { status: "PUBLISHED" } }, orderBy: { createdAt: "desc" }, select: { destination: { select: { id: true, slug: true, name: true } } } }),
    prisma.booking.findMany({ where: mine, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, status: true, guests: true, session: { select: { startsAt: true } }, experience: { select: { name: true } } } }),
    prisma.ticket.findMany({ where: mine, orderBy: { createdAt: "desc" }, take: 300, select: { groupId: true, status: true, event: { select: { id: true, name: true, eventDate: true } } } }),
    prisma.order.findMany({ where: { buyerId: user.id }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, orderNumber: true, status: true, paymentStatus: true, totalAmount: true, items: { select: { quantity: true, product: { select: { name: true } } } } } }),
    prisma.dayPlan.count({ where: mine }),
    prisma.experienceEnquiry.findMany({ where: mine, select: { status: true } }),
    prisma.accommodationEnquiry.findMany({ where: mine, select: { status: true } }),
    prisma.review.findMany({ where: mine, select: { status: true } }),
    prisma.fieldNote.count({ where: { creator: { userId: user.id } } }),
    prisma.reward.findMany({ where: { status: "PUBLISHED" }, select: { status: true, stock: true, validUntil: true, pointsCost: true } }),
    prisma.rewardRedemption.count({ where: { ...mine, status: "ISSUED" } }),
    prisma.newsletterSubscriber.findUnique({ where: { email: user.email }, select: { status: true, confirmedAt: true } }),
    getDeletionBlockers({ id: user.id, role: user.role }),
    prisma.experience.count({ where: { ownerId: user.id } }),
    prisma.accommodation.count({ where: { ownerId: user.id } }),
  ]);

  const stamps: Stamp[] = visits.map((v) => ({ id: v.destination.id, name: v.destination.name, altitudeM: v.destination.altitudeM }));
  const wishes = wishRows.map((w) => w.destination);
  const next = nextToStamp(wishes, stamps.map((s) => s.id));
  const bb = bookingBuckets(bookingRows.map((b) => ({ id: b.id, status: b.status, startsAt: b.session.startsAt, name: b.experience.name, guests: b.guests })), now);
  const tg = ticketGroups(ticketRows.map((t) => ({ groupId: t.groupId, status: t.status, event: t.event })), now);
  const open = orderRows.filter(isOpenOrder);

  const ownsListings = ownedExp + ownedAcc > 0;
  const work = workKinds(user.role, ownsListings);
  let host: HostStats | null = null;
  if (work.includes("host")) {
    const [pendingRequests, newExpEnq, newAccEnq, liveExp, liveAcc, payout] = await Promise.all([
      prisma.booking.count({ where: { status: "REQUESTED", experience: { ownerId: user.id } } }),
      prisma.experienceEnquiry.count({ where: { status: "NEW", experience: { ownerId: user.id } } }),
      prisma.accommodationEnquiry.count({ where: { status: "NEW", accommodation: { ownerId: user.id } } }),
      prisma.experience.count({ where: { ownerId: user.id, status: "PUBLISHED" } }),
      prisma.accommodation.count({ where: { ownerId: user.id, status: "PUBLISHED" } }),
      prisma.hostPayout.aggregate({ where: { hostId: user.id, status: "PENDING" }, _sum: { amount: true }, _count: true }),
    ]);
    host = { liveListings: liveExp + liveAcc, pendingRequests, newEnquiries: newExpEnq + newAccEnq, payoutPending: payout._count > 0 ? { amount: payout._sum.amount ?? 0, count: payout._count } : null };
  }

  const comingUp: ComingItem[] = [];
  const b0 = bb.upcoming[0]; if (b0) comingUp.push({ kind: "booking", id: b0.id, name: b0.name, startsAt: b0.startsAt, guests: b0.guests, status: b0.status });
  const t0 = tg.upcoming[0]; if (t0) comingUp.push({ kind: "tickets", id: t0.id, name: t0.event.name, eventDate: t0.event.eventDate, live: t0.live, status: t0.status });
  const o0 = open[0]; if (o0) comingUp.push({ kind: "order", id: o0.id, orderNumber: o0.orderNumber, totalAmount: o0.totalAmount, state: orderState(o0), firstItem: o0.items[0]?.product.name ?? null, otherItems: Math.max(0, o0.items.reduce((n, i) => n + i.quantity, 0) - (o0.items[0]?.quantity ?? 0)) });

  return {
    user,
    ribbon: ribbonOf(stamps), wishes, next,
    bookings: { upcoming: bb.upcoming.length, past: bb.past },
    tickets: { upcoming: tg.upcoming.length, valid: tg.valid, total: tg.groups.length },
    orders: { total: orderRows.length, open: open.length },
    plans,
    enquiries: { total: expEnq.length + accEnq.length, waiting: [...expEnq, ...accEnq].filter(enquiryWaiting).length },
    reviews: { total: reviewRows.length, pending: reviewRows.filter((r) => r.status === "PENDING").length },
    notes,
    rewards: { ready: rewardsReady(rewardRows, user.points, now), vouchers },
    comingUp, work, host, subscriber, blockers,
  };
}
