import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdmitButton } from "@/components/tickets/StaffForms";
import { formatEat } from "@/lib/booking";
import { currentBookingUser } from "@/lib/booking-auth";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL, type TicketStatusKey } from "@/lib/ticket";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ticket check", robots: { index: false } };

/** The page a ticket's QR code opens. Only the event's staff can see anything; it admits nobody until the button is pressed. */
export default async function VerifyPage({ params }: { params: { secret: string } }) {
  const me = await currentBookingUser();
  if (!me) redirect(`/login?next=${encodeURIComponent(`/tickets/verify/${params.secret}`)}`);
  const t = await prisma.ticket.findUnique({ where: { secret: params.secret }, include: { event: { select: { id: true, name: true, eventDate: true, organiserId: true } } } });
  // Not staff for THIS ticket's event? The same 404 as for a code that doesn't exist: the page reveals nothing about tickets to anyone else.
  if (!t || !(me.isAdmin || (me.role === "PARTNER" && t.event.organiserId === me.id))) notFound();
  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <p className="font-body text-xs text-rust">Ticket check</p>
      <h1 className="mt-1 font-display text-3xl text-stone">{t.number}</h1>
      <p className="mt-2 font-body text-stone">{t.holderName}</p>
      <p className="font-body text-sm text-stone/60">{t.event.name} · {formatEat(t.event.eventDate)}</p>
      <p className="mt-4 font-body text-sm text-stone/80">Status: <strong>{STATUS_LABEL[t.status as TicketStatusKey]}</strong>{t.status === "USED" && t.usedAt ? ` (${formatEat(t.usedAt)})` : ""}</p>
      <div className="mt-6"><AdmitButton eventId={t.event.id} secret={params.secret} /></div>
    </div>
  );
}
