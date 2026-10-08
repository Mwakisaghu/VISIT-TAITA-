import Link from "next/link";
import { notFound } from "next/navigation";
import EventTicketsManager from "@/components/tickets/EventTicketsManager";
import { currentBookingUser } from "@/lib/booking-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PartnerEventTicketsPage({ params }: { params: { id: string } }) {
  const me = await currentBookingUser();
  if (!me || !(me.isAdmin || me.role === "PARTNER")) notFound();
  const event = await prisma.event.findUnique({ where: { id: params.id }, include: { organiser: { select: { name: true, email: true } } } });
  // Only this event's organiser (or an admin). Anyone else gets the same 404 as for an event that doesn't exist.
  if (!event || !(me.isAdmin || event.organiserId === me.id)) notFound();
  return (
    <div>
      <Link href="/partner/events" className="font-body text-sm text-stone/60 hover:text-rust">← My events</Link>
      <h1 className="mt-3 font-display text-3xl text-stone">{event.name} — tickets</h1>
      <EventTicketsManager event={event} canEditSettings={false} />
    </div>
  );
}
