import { notFound } from "next/navigation";
import PayoutPhoneForm from "@/components/partners/PayoutPhoneForm";
import { currentBookingUser } from "@/lib/booking-auth";
import { formatEat } from "@/lib/booking";
import { hostOverview } from "@/lib/payout-ops";
import { kes, maskPhone, normalizePayoutPhone, splitAmount } from "@/lib/payout";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const PILL: Record<string, string> = { PENDING: "bg-ochre/15 text-ochre", PAID: "bg-canopy/10 text-canopy", CANCELLED: "bg-stone/10 text-stone/70" };
const LABEL: Record<string, string> = { PENDING: "Being prepared — will be sent soon", PAID: "Paid", CANCELLED: "Not sent — included in a later payout" };

export default async function PartnerPayoutsPage() {
  const me = await currentBookingUser();
  if (!me || !(me.isAdmin || me.role === "PARTNER")) notFound();
  const now = new Date();
  const [o, u] = await Promise.all([hostOverview(prisma, me.id, now), prisma.user.findUnique({ where: { id: me.id }, select: { payoutPhone: true } })]);
  const phone = normalizePayoutPhone(u?.payoutPhone ?? "");
  const paidTotal = o.payouts.filter((p) => p.status === "PAID").reduce((n, p) => n + p.amount, 0);
  const tiles = [
    { label: "Coming up", value: o.upcoming.net, note: "paid bookings for dates still to come (an estimate)" },
    { label: "Being held", value: o.waiting.net, note: `earned, held ${o.settings.holdDays} day${o.settings.holdDays === 1 ? "" : "s"} after the experience` },
    { label: "Ready to be paid", value: o.payable.net, note: "will go into your next payout" },
    { label: "Paid to you so far", value: paidTotal, note: "all payouts sent" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Payouts</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-stone/70">
        Guests pay Visit Taita when they book. After the experience, what they paid and kept (after any refunds) is yours, less Visit Taita&apos;s
        <strong> {o.settings.commissionPercent}% </strong> commission. Your earnings are held for {o.settings.holdDays} day{o.settings.holdDays === 1 ? "" : "s"} after the experience, then we prepare a payout and send it to your M-Pesa number.
        The figures below use today&apos;s {o.settings.commissionPercent}%; the rate written on each payout is the one it was prepared with.
      </p>

      <section aria-labelledby="where" className="mt-8">
        <h2 id="where" className="font-display text-xl text-stone">Where we send your money</h2>
        <div className="mt-3"><PayoutPhoneForm maskedCurrent={phone ? maskPhone(phone) : null} /></div>
      </section>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-sm border border-stone/10 p-4">
            <p className="font-display text-2xl text-stone">{kes(t.value)}</p>
            <p className="mt-1 font-body text-sm text-stone">{t.label}</p>
            <p className="font-body text-xs text-stone/50">{t.note}</p>
          </div>
        ))}
      </div>

      <section aria-labelledby="history" className="mt-10">
        <h2 id="history" className="font-display text-xl text-stone">Your payouts</h2>
        {o.payouts.length === 0 && <p className="mt-3 font-body text-sm text-stone/60">No payouts yet. They appear here once an experience has taken place and its earnings have been held for {o.settings.holdDays} day{o.settings.holdDays === 1 ? "" : "s"}.</p>}
        <ul className="mt-3 divide-y divide-stone/10">
          {o.payouts.map((p) => (
            <li key={p.id} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-body text-stone"><strong>{kes(p.amount)}</strong> <span className="text-sm text-stone/60">for {p.bookingCount} booking{p.bookingCount === 1 ? "" : "s"} · {formatEat(p.createdAt)}</span></p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${PILL[p.status]}`}>{LABEL[p.status]}</span>
              </div>
              <p className="font-body text-xs text-stone/60">Sent to {maskPhone(p.destination)} · {kes(p.grossAmount)} kept − {p.commissionPercent}% commission ({kes(p.commissionAmount)}){p.reference ? ` · M-Pesa receipt ${p.reference}` : ""}</p>
              {p.bookings.length > 0 && (
                <details className="mt-2 font-body text-sm text-stone/80">
                  <summary className="cursor-pointer text-rust">Booking by booking</summary>
                  <table className="mt-2 w-full min-w-[32rem] text-left text-xs">
                    <thead className="text-stone/50"><tr><th scope="col" className="py-1 pr-3">Booking</th><th scope="col" className="pr-3">Experience</th><th scope="col" className="pr-3">Kept</th><th scope="col" className="pr-3">Commission</th><th scope="col">You receive</th></tr></thead>
                    <tbody>{p.bookings.map((b) => { const s = splitAmount(Math.max(0, b.paidAmount - b.refundedAmount), p.commissionPercent); return <tr key={b.id} className="border-t border-stone/10"><td className="py-1 pr-3">{b.reference}</td><td className="pr-3">{b.experience.name}</td><td className="pr-3">{kes(s.gross)}</td><td className="pr-3">{kes(s.commission)}</td><td>{kes(s.net)}</td></tr>; })}</tbody>
                  </table>
                </details>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
