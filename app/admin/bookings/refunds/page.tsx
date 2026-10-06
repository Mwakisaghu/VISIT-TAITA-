import Link from "next/link";
import { RefundForm } from "@/components/admin/BookingAdminForms";
import { redirect } from "next/navigation";
import { currentBookingUser } from "@/lib/booking-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RefundsPage() {
  const me = await currentBookingUser();
  if (!me?.isAdmin) redirect("/admin"); // editors and content managers can use the admin area, but not handle bookings and refunds
  const [todo, done] = await Promise.all([
    prisma.bookingRefund.findMany({ where: { status: { in: ["PENDING", "FAILED"] } }, orderBy: { createdAt: "asc" }, take: 200, include: { booking: { select: { reference: true, guestName: true, guestEmail: true } } } }),
    prisma.bookingRefund.findMany({ where: { status: "SENT" }, orderBy: { processedAt: "desc" }, take: 30, include: { booking: { select: { reference: true, guestName: true } } } }),
  ]);
  return (
    <div>
      <Link href="/admin/bookings" className="font-body text-sm text-stone/60 hover:text-rust">← Bookings</Link>
      <h1 className="mt-3 font-display text-3xl text-stone">Refunds to send</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-stone/60">M-Pesa refunds are sent by hand (Safaricom&apos;s automatic reversals need separate approval). Send each one to the number shown, then record the M-Pesa receipt here — the guest is emailed automatically.</p>
      <ul className="mt-6 divide-y divide-stone/10">
        {todo.map((r) => (
          <li key={r.id} className="py-4">
            <p className="font-body text-sm text-stone"><strong>KES {r.amount.toLocaleString("en-KE")}</strong> → {r.method === "MPESA" ? <>M-Pesa <code>{r.destination ?? "(no number recorded)"}</code></> : "card (refund in your Pesapal dashboard)"}</p>
            <p className="font-body text-xs text-stone/60">{r.booking.reference} · {r.booking.guestName} · {r.reason}{r.status === "FAILED" ? ` · FAILED earlier: ${r.note ?? ""}` : ""}</p>
            <RefundForm refundId={r.id} />
          </li>
        ))}
        {todo.length === 0 && <li className="py-6 font-body text-sm text-stone/50">Nothing to send. 🎉</li>}
      </ul>
      {done.length > 0 && <><h2 className="mt-12 font-display text-xl text-stone">Recently sent</h2><ul className="mt-2 font-body text-sm text-stone/70">{done.map((r) => <li key={r.id}>KES {r.amount.toLocaleString("en-KE")} · {r.booking.reference} · {r.booking.guestName} · {r.reference}</li>)}</ul></>}
    </div>
  );
}
