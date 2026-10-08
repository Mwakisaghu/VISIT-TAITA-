import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DemoNotice from "@/components/DemoNotice";
import TicketPanel from "@/components/tickets/TicketPanel";
import { currentBookingUser } from "@/lib/booking-auth";
import { formatEventDate, programLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { salesOpen } from "@/lib/ticket";

export const dynamic = "force-dynamic"; // seats left and sign-in state are live

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const e = await prisma.event.findUnique({ where: { slug: params.slug }, select: { name: true, blurb: true, status: true } });
  return e && e.status === "PUBLISHED" ? { title: e.name, description: e.blurb } : { title: "Event" };
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  const e = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!e || e.status !== "PUBLISHED") notFound();
  const now = new Date();
  const open = salesOpen({ ticketing: e.ticketing, status: e.status, eventDate: e.eventDate, ticketsCloseAt: e.ticketsCloseAt }, now);
  const left = e.ticketCapacity === null ? null : Math.max(0, e.ticketCapacity - e.ticketsTaken);
  const soldOut = left === 0;
  const viewer = e.ticketing !== "OFF" ? await currentBookingUser() : null;
  const closedReason = e.ticketing === "OFF" ? null : !open.open ? open.reason : soldOut ? "Sorry — this event is sold out." : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/events" className="font-body text-sm text-stone/60 hover:text-rust">← All events</Link>
      <p className="mt-4 font-body text-xs text-rust">{programLabel(e.program)}</p>
      <h1 className="mt-1 font-display text-4xl text-stone">{e.name}</h1>
      <p className="mt-2 font-body text-stone/70">{formatEventDate(e.eventDate)} · {e.location}</p>
      <p className="mt-6 max-w-prose whitespace-pre-line font-body text-stone/80">{e.blurb}</p>
      {e.isDemo && <div className="mt-6"><DemoNotice>sample event — details to be confirmed with the organisers.</DemoNotice></div>}

      {e.ticketing !== "OFF" && (
        <section aria-labelledby="tickets" className="mt-10 rounded-sm border border-stone/10 p-6">
          <h2 id="tickets" className="font-display text-2xl text-stone">{e.ticketing === "FREE" ? "Free tickets" : `Tickets — KES ${e.ticketPrice.toLocaleString("en-KE")}`}</h2>
          <p className="mt-1 font-body text-sm text-stone/60">{e.ticketing === "FREE" ? "This event is free, but we ask you to get a ticket so the organisers know who's coming." : e.payeeName ? `Paid to the organiser (${e.payeeName}). You'll be shown how to pay after you reserve.` : "You'll be shown how to pay after you reserve."}</p>
          <div className="mt-5">
            <TicketPanel eventId={e.id} mode={e.ticketing === "PAID" ? "PAID" : "FREE"} price={e.ticketPrice} perPerson={e.ticketsPerPerson} left={left} signedIn={!!viewer} verified={!!viewer?.emailVerifiedAt} loginHref={`/login?next=/events/${e.slug}`} defaultName={viewer?.name ?? ""} closedReason={closedReason} />
          </div>
        </section>
      )}
    </div>
  );
}
