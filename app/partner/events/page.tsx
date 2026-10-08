import Link from "next/link";
import { notFound } from "next/navigation";
import { formatEat } from "@/lib/booking";
import { currentBookingUser } from "@/lib/booking-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PartnerEventsPage() {
  const me = await currentBookingUser();
  if (!me || !(me.isAdmin || me.role === "PARTNER")) notFound();
  const events = await prisma.event.findMany({ where: { organiserId: me.id }, orderBy: { eventDate: "asc" } });
  return (
    <div>
      <h1 className="font-display text-3xl text-stone">My events</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-stone/60">Events you are collaborating on with Visit Taita. For each you can see who has tickets, confirm payments and admit people at the door.</p>
      {events.length === 0 && <p className="mt-6 font-body text-stone/60">No events are linked to your account yet. Visit Taita links an event to you when you start working together.</p>}
      <ul className="mt-6 divide-y divide-stone/10">
        {events.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div><p className="font-body text-stone">{e.name}</p><p className="font-body text-xs text-stone/60">{formatEat(e.eventDate)} · {e.location} · {e.ticketing === "OFF" ? "no tickets" : e.ticketing === "FREE" ? "free tickets" : "paid tickets"}{e.ticketing !== "OFF" ? ` · ${e.ticketsTaken}${e.ticketCapacity !== null ? ` / ${e.ticketCapacity}` : ""} taken` : ""}</p></div>
            <Link href={`/partner/events/${e.id}/tickets`} className="focus-ring rounded-full border border-stone/20 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust">Tickets</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
