import Link from "next/link";
import { notFound } from "next/navigation";
import { AddDatesForm, SessionRow, SettingsForm } from "@/components/partners/AvailabilityForms";
import { formatEat } from "@/lib/booking";
import { currentBookingUser } from "@/lib/booking-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage({ params }: { params: { id: string } }) {
  const user = await currentBookingUser();
  if (!user || !(user.isAdmin || user.role === "PARTNER")) notFound();
  const e = await prisma.experience.findUnique({ where: { id: params.id } });
  if (!e || !(user.isAdmin || e.ownerId === user.id)) notFound();
  const sessions = await prisma.experienceSession.findMany({ where: { experienceId: e.id, startsAt: { gt: new Date(Date.now() - 3 * 86400000) } }, orderBy: { startsAt: "asc" }, take: 120 });

  return (
    <div>
      <Link href={`/partner/experiences/${e.id}`} className="font-body text-sm text-stone/60 hover:text-rust">← {e.name}</Link>
      <h1 className="mt-3 font-display text-3xl text-stone">Booking &amp; availability</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-stone/60">
        Guests can book the dates you add here, and pay online. The price is the per-person price on the experience
        ({e.priceFrom ? `KES ${e.priceFrom.toLocaleString("en-KE")}` : <strong className="text-rust">not set yet — set one before switching booking on</strong>}).
      </p>

      <h2 className="mt-10 font-display text-xl text-stone">Settings</h2>
      <div className="mt-3"><SettingsForm experienceId={e.id} s={{ bookingEnabled: e.bookingEnabled, paymentMode: e.paymentMode, depositPercent: e.depositPercent, balanceDueDays: e.balanceDueDays, cancellationPolicy: e.cancellationPolicy, bookingCutoffHours: e.bookingCutoffHours, maxGuestsPerBooking: e.maxGuestsPerBooking }} /></div>

      <h2 className="mt-12 font-display text-xl text-stone">Add dates</h2>
      <div className="mt-3"><AddDatesForm experienceId={e.id} defaultCapacity={e.groupSizeMax ?? 8} /></div>

      <h2 className="mt-12 font-display text-xl text-stone">Your dates</h2>
      <ul className="mt-2 divide-y divide-stone/10">
        {sessions.map((s) => <SessionRow key={s.id} id={s.id} capacity={s.capacity} seatsTaken={s.seatsTaken} status={s.status} note={s.note} whenLabel={formatEat(s.startsAt)} />)}
        {sessions.length === 0 && <li className="py-4 font-body text-sm text-stone/50">No dates yet.</li>}
      </ul>
    </div>
  );
}
