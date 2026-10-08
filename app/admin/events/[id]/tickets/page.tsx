import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EventTicketsManager from "@/components/tickets/EventTicketsManager";
import { currentBookingUser } from "@/lib/booking-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminEventTicketsPage({ params }: { params: { id: string } }) {
  const me = await currentBookingUser();
  if (!me?.isAdmin) redirect("/admin"); // tickets hold names, phone numbers and payment details: admins and super admins only
  const event = await prisma.event.findUnique({ where: { id: params.id }, include: { organiser: { select: { name: true, email: true } } } });
  if (!event) notFound();
  return (
    <div>
      <Link href="/admin/events" className="font-body text-sm text-stone/60 hover:text-rust">← Events</Link>
      <h1 className="mt-3 font-display text-3xl text-stone">{event.name} — tickets</h1>
      <EventTicketsManager event={event} canEditSettings />
    </div>
  );
}
