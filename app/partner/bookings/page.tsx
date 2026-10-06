import { notFound } from "next/navigation";
import HostBookingActions from "@/components/partners/HostBookingActions";
import { bookingStatusLabel, formatEat } from "@/lib/booking";
import { currentBookingUser } from "@/lib/booking-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PartnerBookingsPage() {
  const user = await currentBookingUser();
  if (!user || !(user.isAdmin || user.role === "PARTNER")) notFound();
  const where = user.isAdmin ? {} : { experience: { ownerId: user.id } };
  const bookings = await prisma.booking.findMany({
    where: { ...where, status: { in: ["REQUESTED", "AWAITING_PAYMENT", "CONFIRMED", "COMPLETED", "NO_SHOW"] } },
    orderBy: { session: { startsAt: "asc" } }, take: 200,
    include: { session: { select: { startsAt: true } }, experience: { select: { name: true } } },
  });
  const now = new Date();
  const requests = bookings.filter((b) => b.status === "REQUESTED");
  const upcoming = bookings.filter((b) => b.status !== "REQUESTED" && b.session.startsAt > now && ["AWAITING_PAYMENT", "CONFIRMED"].includes(b.status));
  const needsRecord = bookings.filter((b) => b.status === "CONFIRMED" && b.session.startsAt <= now);

  const card = (b: (typeof bookings)[number]) => (
    <li key={b.id} className="py-4">
      <p className="font-body text-sm text-stone">{b.experience.name} · {formatEat(b.session.startsAt)}</p>
      <p className="font-body text-sm text-stone/70">{b.guestName} · {b.guests} guest{b.guests === 1 ? "" : "s"} · {b.guestPhone} · {b.guestEmail}</p>
      <p className="font-body text-xs text-stone/50">{bookingStatusLabel(b.status)} · paid KES {b.paidAmount.toLocaleString("en-KE")} of {b.totalAmount.toLocaleString("en-KE")} · {b.reference}{b.status === "REQUESTED" && b.expiresAt ? ` · answer by ${formatEat(b.expiresAt)}` : ""}</p>
      {b.note && <p className="mt-1 font-body text-sm text-stone/70">“{b.note}”</p>}
      <HostBookingActions bookingId={b.id} status={b.status} started={b.session.startsAt <= now} />
    </li>
  );
  const section = (title: string, items: typeof bookings, empty: string) => (
    <section className="mt-10"><h2 className="font-display text-xl text-stone">{title}</h2><ul className="mt-2 divide-y divide-stone/10">{items.map(card)}{items.length === 0 && <li className="py-3 font-body text-sm text-stone/50">{empty}</li>}</ul></section>
  );
  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Bookings</h1>
      {section("Needs your answer", requests, "No requests waiting.")}
      {section("Upcoming", upcoming, "Nothing upcoming.")}
      {section("Please record who came", needsRecord, "All up to date.")}
    </div>
  );
}
