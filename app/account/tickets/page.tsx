import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SubpageFrame, { EmptyList, ListCard } from "@/components/account-hub/SubpageFrame";
import TicketSheet from "@/components/account-hub/TicketSheet";
import { formatDayTime, ticketGroups } from "@/lib/account-hub-rules";
import { ticketChip, ticketCount } from "@/lib/account-hub-text";
import { currentBookingUser } from "@/lib/booking-auth";
import { checkinBaseUrl } from "@/lib/checkin-url";
import { getLocale, lp, tr } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { kes } from "@/lib/ticket";
import { ticketWhen } from "@/lib/ticket-pdf-text";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { return { title: tr("My tickets"), robots: { index: false } }; }

// `props` is required in the TYPE (Next checks a page's props at build time and refuses one that may be undefined); it is read with ?. so a bare call (as the tests make) still works.
export default async function MyTicketsPage(props: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await currentBookingUser();
  if (!me) redirect(`${lp("/login")}?next=%2Faccount%2Ftickets`);
  const l = getLocale();
  const tickets = await prisma.ticket.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 300, include: { event: { select: { id: true, name: true, eventDate: true, location: true } } } });
  // The same rules as the account page's "Coming up": tickets reserved together are one group; upcoming means the event is still to come and the group is valid or waiting for payment. Soonest first; the rest most recent first.
  const { groups, upcoming } = ticketGroups(tickets.map((t) => ({ groupId: t.groupId, status: t.status, number: t.number, event: t.event })), new Date());
  // ?open=<group> shows that group beside the list. It is only ever one of THIS person's own groups (the list is built from their tickets), so a made-up, malformed or someone else's id simply shows nothing.
  const sp = (await props?.searchParams) ?? {}; const openId = typeof sp.open === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(sp.open) ? sp.open : null; const openGroup = openId ? groups.find((g) => g.id === openId) : undefined;
  const here = lp("/account/tickets"); const base = openGroup ? checkinBaseUrl() : null;
  const sheetTickets = openGroup ? tickets.filter((t) => t.groupId === openGroup.id).sort((a, b) => a.number.localeCompare(b.number)) : [];
  const validCount = sheetTickets.filter((t) => t.status === "VALID").length;
  const upcomingIds = new Set(upcoming.map((g) => g.id)); const rest = groups.filter((g) => !upcomingIds.has(g.id)).sort((a, b) => b.event.eventDate.getTime() - a.event.eventDate.getTime());
  const list = (items: typeof groups) => (
    <ul className="flex flex-col gap-3" role="list">
      {items.map((g) => (
        <ListCard key={g.id} title={g.event.name} href={`${here}?open=${g.id}`} current={g.id === openGroup?.id} keepScroll meta={tr("{when}. {tickets}.", { when: formatDayTime(g.event.eventDate, l), tickets: ticketCount(g.count) })} chip={ticketChip(g.status)}>
          {g.numbers.length > 0 && <p className="font-body text-sm text-stone/80">{tr("Ticket numbers: {numbers}", { numbers: g.numbers.join(", ") })}</p>}
        </ListCard>
      ))}
    </ul>
  );
  return (
    <SubpageFrame title={tr("My tickets")} intro={tr("Your tickets for events, and which are ready to use.")} wide={!!openGroup}>
      {groups.length === 0 ? (
        <EmptyList title={tr("No tickets yet")} body={tr("When you get tickets for an event, they appear here with their QR codes.")} actions={[{ label: tr("See what is on"), href: lp("/events") }]} />
      ) : (
        <div className={openGroup ? "lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-8" : ""}>
        <div className="flex flex-col gap-8">
          {upcoming.length > 0 && <section aria-labelledby="coming-h"><h2 id="coming-h" className="mb-3 font-display text-xl font-semibold">{tr("Coming up")}</h2>{list(upcoming)}</section>}
          {rest.length > 0 && <section aria-labelledby="past-h"><h2 id="past-h" className="mb-3 font-display text-xl font-semibold">{tr("Past and cancelled")}</h2>{list(rest)}</section>}
        </div>
        {openGroup && (
          <TicketSheet
            groupId={openGroup.id} eventName={openGroup.event.name} whenText={ticketWhen(openGroup.event.eventDate, l)} location={sheetTickets[0]?.event.location ?? ""}
            tickets={sheetTickets.map((t) => ({ id: t.id, number: t.number, holderName: t.holderName, status: t.status, priceText: t.price > 0 ? kes(t.price) : tr("Free"), qrUrl: base && t.status === "VALID" ? `${base}/tickets/verify/${t.secret}` : null }))}
            validCount={validCount} closeHref={here} pdfHref={validCount > 0 ? `/tickets/${openGroup.id}/pdf?lang=${l}` : null} fullHref={lp(`/tickets/${openGroup.id}`)}
          />
        )}
        </div>
      )}
    </SubpageFrame>
  );
}
