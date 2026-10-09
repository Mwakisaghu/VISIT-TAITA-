import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DemoNotice from "@/components/DemoNotice";
import TicketPanel from "@/components/tickets/TicketPanel";
import { currentBookingUser } from "@/lib/booking-auth";
import { programLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { salesOpen } from "@/lib/ticket";
import Tag from "@/components/field/Tag";
import PersonChip from "@/components/field/PersonChip";
import EventFacts from "@/components/events/EventFacts";
import ShareLinks from "@/components/events/ShareLinks";

export const dynamic = "force-dynamic"; // seats left and sign-in state are live

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const e = await prisma.event.findUnique({ where: { slug: params.slug }, select: { name: true, blurb: true, status: true } });
  return e && e.status === "PUBLISHED" ? { title: e.name, description: e.blurb } : { title: "Event" };
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  const e = await prisma.event.findUnique({ where: { slug: params.slug }, include: { organiser: { select: { name: true } } } });
  if (!e || e.status !== "PUBLISHED") notFound();
  const now = new Date();
  const open = salesOpen({ ticketing: e.ticketing, status: e.status, eventDate: e.eventDate, ticketsCloseAt: e.ticketsCloseAt }, now);
  const left = e.ticketCapacity === null ? null : Math.max(0, e.ticketCapacity - e.ticketsTaken);
  const soldOut = left === 0;
  const viewer = e.ticketing !== "OFF" ? await currentBookingUser() : null;
  const closedReason = e.ticketing === "OFF" ? null : !open.open ? open.reason : soldOut ? "Sorry — this event is sold out." : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/events" className="font-body text-sm text-stone/70 hover:text-rust">← All events</Link>
      <div className="mt-6"><Tag tone="rust">{programLabel(e.program)}</Tag></div>
      <h1 className="mt-4 font-display text-[clamp(2.4rem,6vw,3.75rem)] font-medium leading-[1.05] tracking-tight text-stone">{e.name}</h1>
      <div className="mt-8"><EventFacts event={e} now={now} /></div>
      <div className="mt-3"><ShareLinks slug={e.slug} name={e.name} date={e.eventDate} location={e.location} siteUrl={process.env.NEXT_PUBLIC_APP_URL} /></div>
      <p className="mt-8 max-w-prose whitespace-pre-line font-body text-lg leading-relaxed text-stone/85">{e.blurb}</p>
      {e.organiser?.name && (
        <div className="mt-8 rounded-[2px] border border-stone/15 p-5">
          <PersonChip name={e.organiser.name} verb="Organised by" />
        </div>
      )}
      {e.isDemo && <div className="mt-6"><DemoNotice>sample event — details to be confirmed with the organisers.</DemoNotice></div>}

      {e.ticketing !== "OFF" && (
        <section aria-labelledby="tickets" className="mt-10 rounded-sm border border-stone/10 p-6">
          <h2 id="tickets" className="font-display text-2xl text-stone">{e.ticketing === "FREE" ? "Free tickets" : `Tickets — KES ${e.ticketPrice.toLocaleString("en-KE")}`}</h2>
          <p className="mt-1 font-body text-sm text-stone/70">{e.ticketing === "FREE" ? "This event is free, but we ask you to get a ticket so the organisers know who's coming." : e.payeeName ? `Paid to the organiser (${e.payeeName}). You'll be shown how to pay after you reserve.` : "You'll be shown how to pay after you reserve."}</p>
          <div className="mt-5">
            <TicketPanel eventId={e.id} mode={e.ticketing === "PAID" ? "PAID" : "FREE"} price={e.ticketPrice} perPerson={e.ticketsPerPerson} left={left} signedIn={!!viewer} verified={!!viewer?.emailVerifiedAt} loginHref={`/login?next=/events/${e.slug}`} defaultName={viewer?.name ?? ""} closedReason={closedReason} />
          </div>
        </section>
      )}
    </div>
  );
}
