import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import CancelPanel from "@/components/bookings/CancelPanel";
import PayPanel from "@/components/bookings/PayPanel";
import { authOptions } from "@/lib/auth";
import { bookingStatusLabel, formatEat, nextPaymentDue, policyLabel, policyLines, type CancellationPolicyKey, type PaymentModeKey } from "@/lib/booking";
import { paymentChannels } from "@/lib/booking-config";
import { syncBookingPayments } from "@/lib/booking-payments";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

export default async function BookingPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?next=${encodeURIComponent(`/bookings/${params.id}`)}`);
  const mine = await prisma.booking.findFirst({ where: { id: params.id, userId: session.user.id }, select: { id: true } });
  if (!mine) notFound();

  await syncBookingPayments(mine.id); // coming back from a card payment, or a missed callback: ask the provider now
  const b = await prisma.booking.findUniqueOrThrow({
    where: { id: mine.id },
    include: { session: { select: { startsAt: true } }, experience: { select: { name: true, slug: true, contactPhone: true, contactEmail: true } }, payments: { orderBy: { createdAt: "desc" } }, refunds: { orderBy: { createdAt: "asc" } } },
  });

  const due = nextPaymentDue({ status: b.status, paymentMode: b.paymentMode as PaymentModeKey, totalAmount: b.totalAmount, depositAmount: b.depositAmount, paidAmount: b.paidAmount });
  const waiting = b.payments.some((p) => p.status === "PENDING");
  const channels = paymentChannels();
  const cancellable = ["REQUESTED", "AWAITING_PAYMENT", "CONFIRMED"].includes(b.status) && b.session.startsAt > new Date();
  const policy = b.cancellationPolicy as CancellationPolicyKey;
  // What the later payment will be: the price minus the deposit (also BEFORE the deposit is paid), or what is still unpaid once it has been.
  const balanceOwed = b.status === "AWAITING_PAYMENT" && b.depositAmount ? b.totalAmount - b.depositAmount : b.totalAmount - b.paidAmount;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/account/bookings" className="font-body text-sm text-stone/60 hover:text-rust">← My bookings</Link>
      <h1 className="mt-3 font-display text-3xl text-stone">{b.experience.name}</h1>
      <p className="mt-1 font-body text-sm text-stone/60">Booking {b.reference} · <strong className={b.status === "CONFIRMED" || b.status === "COMPLETED" ? "text-canopy" : ["CANCELLED", "DECLINED", "EXPIRED"].includes(b.status) ? "text-rust" : "text-stone"}>{bookingStatusLabel(b.status)}</strong></p>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 font-body text-sm">
        <dt className="text-stone/50">When</dt><dd>{formatEat(b.session.startsAt)}</dd>
        <dt className="text-stone/50">Guests</dt><dd>{b.guests}</dd>
        <dt className="text-stone/50">Price</dt><dd>{kes(b.unitPrice)} × {b.guests} = {kes(b.totalAmount)}</dd>
        <dt className="text-stone/50">Paid</dt><dd>{kes(b.paidAmount)}</dd>
        {b.balanceDueAt && balanceOwed > 0 && ["AWAITING_PAYMENT", "CONFIRMED"].includes(b.status) && <><dt className="text-stone/50">Balance due</dt><dd>{kes(balanceOwed)} by {formatEat(b.balanceDueAt)}</dd></>}
      </dl>

      {b.status === "REQUESTED" && <p className="mt-6 rounded-sm border border-stone/15 bg-stone/5 p-4 font-body text-sm text-stone/80">Your request has been sent to the host{b.expiresAt ? ` — they have until ${formatEat(b.expiresAt)} to reply` : ""}. We&apos;ll email you; nothing is charged unless they accept.</p>}
      {b.status === "CONFIRMED" && (b.experience.contactPhone || b.experience.contactEmail) && <p className="mt-6 font-body text-sm text-stone/80">Questions? Contact the host: {[b.experience.contactPhone, b.experience.contactEmail].filter(Boolean).join(" · ")}</p>}
      {["CANCELLED", "DECLINED", "EXPIRED"].includes(b.status) && b.cancelReason && <p className="mt-6 font-body text-sm text-stone/70">Reason: {b.cancelReason}</p>}

      {due && due.amount > 0 && (b.status === "AWAITING_PAYMENT" || b.status === "CONFIRMED") && (
        <section className="mt-8">
          <h2 className="font-display text-xl text-stone">{b.status === "AWAITING_PAYMENT" ? "Pay to confirm your place" : "Pay the balance"}</h2>
          {b.status === "AWAITING_PAYMENT" && b.expiresAt && <p className="mt-1 font-body text-xs text-stone/50">Your seats are held until {formatEat(b.expiresAt)}.</p>}
          <div className="mt-4"><PayPanel bookingId={b.id} amount={due.amount} kind={due.kind} defaultPhone={b.guestPhone} mpesa={channels.mpesa} card={channels.card} waiting={waiting} /></div>
        </section>
      )}

      {b.refunds.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl text-stone">Refunds</h2>
          <ul className="mt-2 space-y-1 font-body text-sm text-stone/80">
            {b.refunds.map((r) => <li key={r.id}>{kes(r.amount)} — {r.status === "SENT" ? `sent${r.reference ? ` (reference ${r.reference})` : ""}` : r.status === "FAILED" ? "we hit a problem sending this and are fixing it" : "being prepared; we send refunds by hand, normally within 3 working days"}</li>)}
          </ul>
        </section>
      )}

      {cancellable && <section className="mt-8"><CancelPanel bookingId={b.id} /></section>}

      <section className="mt-10 font-body text-sm text-stone/70">
        <h2 className="font-display text-lg text-stone">Cancellation policy — {policyLabel(policy)}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">{policyLines(policy).map((l) => <li key={l}>{l}</li>)}</ul>
      </section>
    </div>
  );
}
