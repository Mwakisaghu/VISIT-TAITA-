import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CancelMyTicketsButton, ClaimPaymentForm } from "@/components/tickets/GuestForms";
import { formatEat } from "@/lib/booking";
import { currentBookingUser } from "@/lib/booking-auth";
import { checkinBaseUrl } from "@/lib/checkin-url";
import { qrSvg } from "@/lib/qr-code";
import { prisma } from "@/lib/prisma";
import { kes, paymentInstructions, STATUS_LABEL, type TicketStatusKey } from "@/lib/ticket";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your tickets", robots: { index: false } };
const PILL: Record<string, string> = { VALID: "bg-canopy/10 text-canopy", USED: "bg-stone/10 text-stone/70", PENDING_PAYMENT: "bg-ochre/15 text-ochre", CANCELLED: "bg-rust/10 text-rust", EXPIRED: "bg-stone/10 text-stone/60" };

export default async function TicketsPage({ params }: { params: { group: string } }) {
  const me = await currentBookingUser();
  if (!me) redirect(`/login?next=${encodeURIComponent(`/tickets/${params.group}`)}`);
  const tickets = await prisma.ticket.findMany({ where: { groupId: params.group, userId: me.id }, orderBy: { number: "asc" }, include: { event: true } });
  if (tickets.length === 0) notFound(); // someone else's tickets look exactly like tickets that don't exist
  const ev = tickets[0].event;
  const base = checkinBaseUrl();
  const waiting = tickets.filter((t) => t.status === "PENDING_PAYMENT" || t.status === "EXPIRED");
  const live = tickets.filter((t) => t.status === "VALID");
  const started = ev.eventDate.getTime() <= Date.now();
  const canCancel = !started && tickets.some((t) => t.status === "PENDING_PAYMENT" || (t.status === "VALID" && t.price === 0));
  const instructions = waiting.length ? paymentInstructions(ev, tickets[0].number, waiting.length) : null;
  const qrs = new Map<string, string>();
  if (base) for (const t of live) qrs.set(t.id, await qrSvg(`${base}/tickets/verify/${t.secret}`));
  const claimed = waiting.find((t) => t.claimedReference)?.claimedReference ?? null;
  const expiresAt = tickets.find((t) => t.status === "PENDING_PAYMENT")?.expiresAt ?? null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/account/tickets" className="font-body text-sm text-stone/60 hover:text-rust">← My tickets</Link>
      <h1 className="mt-3 font-display text-3xl text-stone">{ev.name}</h1>
      <p className="mt-1 font-body text-sm text-stone/60">{formatEat(ev.eventDate)} · {ev.location}</p>

      {waiting.length > 0 && instructions && (
        <section aria-labelledby="pay" className="mt-8 rounded-sm border border-ochre/40 bg-ochre/5 p-5">
          <h2 id="pay" className="font-display text-xl text-stone">{tickets.some((t) => t.status === "PENDING_PAYMENT") ? "Pay to confirm your tickets" : "This reservation expired"}</h2>
          {tickets.some((t) => t.status === "PENDING_PAYMENT") ? (
            <>
              <ul className="mt-3 list-disc space-y-1 pl-5 font-body text-sm text-stone/80">{instructions.lines.map((l) => <li key={l}>{l}</li>)}</ul>
              {expiresAt && <p className="mt-3 font-body text-sm text-stone/70">We&apos;ll hold your {waiting.length === 1 ? "ticket" : "tickets"} until <strong>{formatEat(expiresAt)}</strong>. After that, if the payment hasn&apos;t been confirmed, {waiting.length === 1 ? "it is" : "they are"} released.</p>}
            </>
          ) : (
            <p className="mt-2 font-body text-sm text-stone/70">The payment wasn&apos;t confirmed in time, so the seats were released. If you did pay, enter your M-Pesa code below: the organiser can still confirm it if seats are left.</p>
          )}
          <div className="mt-4"><ClaimPaymentForm groupId={params.group} existing={claimed} /></div>
        </section>
      )}

      <ul className="mt-8 space-y-6">
        {tickets.map((t) => (
          <li key={t.id} className="rounded-sm border border-stone/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-2xl tracking-wide text-stone">{t.number}</p>
              <span className={`rounded-full px-2.5 py-0.5 text-xs ${PILL[t.status]}`}>{STATUS_LABEL[t.status as TicketStatusKey]}</span>
            </div>
            <p className="mt-1 font-body text-sm text-stone/60">{t.holderName}{t.price > 0 ? ` · ${kes(t.price)}` : " · free"}</p>
            {t.status === "VALID" && (qrs.has(t.id)
              ? <div className="mt-4 w-48 rounded-sm border border-stone/15 bg-white p-1 [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={`QR code for ticket ${t.number}`} dangerouslySetInnerHTML={{ __html: qrs.get(t.id) as string }} />
              : <p className="mt-3 font-body text-sm text-stone/70">Show this ticket number at the door: <strong>{t.number}</strong></p>)}
            {t.status === "VALID" && <p className="mt-2 font-body text-xs text-stone/50">Show this at the door. Anyone with this code can use the ticket, so please don&apos;t post it online.</p>}
            {t.status === "USED" && t.usedAt && <p className="mt-2 font-body text-sm text-stone/60">Used at the door on {formatEat(t.usedAt)}.</p>}
            {t.status === "CANCELLED" && t.cancelReason && <p className="mt-2 font-body text-sm text-stone/60">Reason: {t.cancelReason}</p>}
          </li>
        ))}
      </ul>

      {live.some((t) => t.price > 0) && <p className="mt-6 font-body text-sm text-stone/60">Paid tickets can&apos;t be cancelled here. For a refund, please contact the organiser: your payment went to them, not to Visit Taita.</p>}
      {canCancel && <div className="mt-6"><CancelMyTicketsButton groupId={params.group} /></div>}
    </div>
  );
}
