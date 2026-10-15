import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SubpageFrame, { EmptyList, ListCard } from "@/components/account-hub/SubpageFrame";
import { formatDayTime, ticketGroups } from "@/lib/account-hub-rules";
import { ticketChip, ticketCount } from "@/lib/account-hub-text";
import { currentBookingUser } from "@/lib/booking-auth";
import { getLocale, lp, tr } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { return { title: tr("My tickets"), robots: { index: false } }; }

export default async function MyTicketsPage() {
  const me = await currentBookingUser();
  if (!me) redirect(`${lp("/login")}?next=%2Faccount%2Ftickets`);
  const l = getLocale();
  const tickets = await prisma.ticket.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 300, include: { event: { select: { id: true, name: true, eventDate: true } } } });
  // The same rules as the account page's "Coming up": tickets reserved together are one group; upcoming means the event is still to come and the group is valid or waiting for payment. Soonest first; the rest most recent first.
  const { groups, upcoming } = ticketGroups(tickets.map((t) => ({ groupId: t.groupId, status: t.status, number: t.number, event: t.event })), new Date());
  const upcomingIds = new Set(upcoming.map((g) => g.id)); const rest = groups.filter((g) => !upcomingIds.has(g.id)).sort((a, b) => b.event.eventDate.getTime() - a.event.eventDate.getTime());
  const list = (items: typeof groups) => (
    <ul className="flex flex-col gap-3" role="list">
      {items.map((g) => (
        <ListCard key={g.id} title={g.event.name} href={lp(`/tickets/${g.id}`)} meta={tr("{when}. {tickets}.", { when: formatDayTime(g.event.eventDate, l), tickets: ticketCount(g.count) })} chip={ticketChip(g.status)}>
          {g.numbers.length > 0 && <p className="font-body text-sm text-stone/80">{tr("Ticket numbers: {numbers}", { numbers: g.numbers.join(", ") })}</p>}
        </ListCard>
      ))}
    </ul>
  );
  return (
    <SubpageFrame title={tr("My tickets")} intro={tr("Your tickets for events, and which are ready to use.")}>
      {groups.length === 0 ? (
        <EmptyList title={tr("No tickets yet")} body={tr("When you get tickets for an event, they appear here with their QR codes.")} actions={[{ label: tr("See what is on"), href: lp("/events") }]} />
      ) : (
        <div className="flex flex-col gap-8">
          {upcoming.length > 0 && <section aria-labelledby="coming-h"><h2 id="coming-h" className="mb-3 font-display text-xl font-semibold">{tr("Coming up")}</h2>{list(upcoming)}</section>}
          {rest.length > 0 && <section aria-labelledby="past-h"><h2 id="past-h" className="mb-3 font-display text-xl font-semibold">{tr("Past and cancelled")}</h2>{list(rest)}</section>}
        </div>
      )}
    </SubpageFrame>
  );
}
