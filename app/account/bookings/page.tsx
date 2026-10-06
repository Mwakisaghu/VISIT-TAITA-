import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { bookingStatusLabel, formatEat } from "@/lib/booking";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My bookings", robots: { index: false } };

export default async function MyBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?next=/account/bookings");
  const bookings = await prisma.booking.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 100, include: { session: { select: { startsAt: true } }, experience: { select: { name: true } } } });
  const now = new Date();
  const upcoming = bookings.filter((b) => b.session.startsAt > now && ["REQUESTED", "AWAITING_PAYMENT", "CONFIRMED"].includes(b.status));
  const rest = bookings.filter((b) => !upcoming.includes(b));
  const list = (items: typeof bookings) => (
    <ul className="mt-3 divide-y divide-stone/10">
      {items.map((b) => (
        <li key={b.id} className="py-3">
          <Link href={`/bookings/${b.id}`} className="font-body text-stone hover:text-rust">{b.experience.name}</Link>
          <p className="font-body text-xs text-stone/60">{formatEat(b.session.startsAt)} · {b.guests} guest{b.guests === 1 ? "" : "s"} · {bookingStatusLabel(b.status)} · {b.reference}</p>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/account" className="font-body text-sm text-stone/60 hover:text-rust">← My account</Link>
      <h1 className="mt-3 font-display text-3xl text-stone">My bookings</h1>
      {bookings.length === 0 && <p className="mt-6 font-body text-stone/60">You haven&apos;t booked anything yet. <Link href="/experiences" className="text-rust underline">Browse experiences</Link>.</p>}
      {upcoming.length > 0 && <><h2 className="mt-8 font-display text-xl text-stone">Upcoming</h2>{list(upcoming)}</>}
      {rest.length > 0 && <><h2 className="mt-8 font-display text-xl text-stone">Past and cancelled</h2>{list(rest)}</>}
    </div>
  );
}
