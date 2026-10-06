import Link from "next/link";
import { AdminCancelForm } from "@/components/admin/BookingAdminForms";
import { bookingStatusLabel, formatEat } from "@/lib/booking";
import { redirect } from "next/navigation";
import { currentBookingUser } from "@/lib/booking-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const STATUSES = ["REQUESTED", "AWAITING_PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED", "DECLINED", "EXPIRED", "NO_SHOW"];

export default async function AdminBookingsPage({ searchParams }: { searchParams: { status?: string } }) {
  const me = await currentBookingUser();
  if (!me?.isAdmin) redirect("/admin"); // editors and content managers can use the admin area, but not handle bookings and refunds
  const status = STATUSES.includes(searchParams.status ?? "") ? searchParams.status : undefined;
  const [bookings, pendingRefunds] = await Promise.all([
    prisma.booking.findMany({ where: status ? { status: status as never } : {}, orderBy: { createdAt: "desc" }, take: 100, include: { session: { select: { startsAt: true } }, experience: { select: { name: true } } } }),
    prisma.bookingRefund.count({ where: { status: { in: ["PENDING", "FAILED"] } } }),
  ]);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-stone">Bookings</h1>
        <Link href="/admin/bookings/refunds" className="focus-ring rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust">Refunds to send ({pendingRefunds})</Link>
      </div>
      <p className="mt-4 flex flex-wrap gap-3 font-body text-xs"><Link href="/admin/bookings" className={!status ? "text-rust" : "text-stone/60"}>All</Link>{STATUSES.map((s) => <Link key={s} href={`/admin/bookings?status=${s}`} className={status === s ? "text-rust" : "text-stone/60 hover:text-rust"}>{bookingStatusLabel(s)}</Link>)}</p>
      <ul className="mt-6 divide-y divide-stone/10">
        {bookings.map((b) => (
          <li key={b.id} className="py-4">
            <p className="font-body text-sm text-stone">{b.reference} · {b.experience.name} · {formatEat(b.session.startsAt)}</p>
            <p className="font-body text-xs text-stone/60">{b.guestName} · {b.guests} guest{b.guests === 1 ? "" : "s"} · {bookingStatusLabel(b.status)} · paid KES {b.paidAmount.toLocaleString("en-KE")} of {b.totalAmount.toLocaleString("en-KE")} · refunds KES {b.refundedAmount.toLocaleString("en-KE")}</p>
            {["REQUESTED", "AWAITING_PAYMENT", "CONFIRMED"].includes(b.status) && <details className="mt-1"><summary className="cursor-pointer font-body text-sm text-rust">Cancel…</summary><AdminCancelForm bookingId={b.id} /></details>}
          </li>
        ))}
        {bookings.length === 0 && <li className="py-6 font-body text-sm text-stone/50">No bookings.</li>}
      </ul>
    </div>
  );
}
