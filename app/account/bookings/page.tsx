import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import SubpageFrame, { EmptyList, ListCard } from "@/components/account-hub/SubpageFrame";
import { bookingBuckets, formatDayTime } from "@/lib/account-hub-rules";
import { bookingChip, guestCount } from "@/lib/account-hub-text";
import { authOptions } from "@/lib/auth";
import { getLocale, lp, tr } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { return { title: tr("My bookings"), robots: { index: false } }; }

export default async function MyBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`${lp("/login")}?next=%2Faccount%2Fbookings`);
  const l = getLocale();
  const bookings = await prisma.booking.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 100, include: { session: { select: { startsAt: true } }, experience: { select: { name: true } } } });
  const rows = bookings.map((b) => ({ id: b.id, status: b.status, startsAt: b.session.startsAt, name: b.experience.name, guests: b.guests, reference: b.reference }));
  // The same rule as the account page's "Coming up", so the two can never disagree: what is still to come and still alive, soonest first. Everything else, most recent first.
  const { upcoming } = bookingBuckets(rows, new Date()); const upcomingIds = new Set(upcoming.map((b) => b.id));
  const rest = rows.filter((b) => !upcomingIds.has(b.id)).sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  const list = (items: typeof rows) => (
    <ul className="flex flex-col gap-3" role="list">
      {items.map((b) => <ListCard key={b.id} title={b.name} href={lp(`/bookings/${b.id}`)} meta={tr("{when}. {guests}. Reference {reference}.", { when: formatDayTime(b.startsAt, l), guests: guestCount(b.guests), reference: b.reference })} chip={bookingChip(b.status)} />)}
    </ul>
  );
  return (
    <SubpageFrame title={tr("My bookings")} intro={tr("The experiences you have booked, and where each one stands.")}>
      {rows.length === 0 ? (
        <EmptyList title={tr("Nothing booked yet")} body={tr("When you book an experience, you can follow it here, from request to confirmation.")} actions={[{ label: tr("Browse experiences"), href: lp("/experiences") }]} />
      ) : (
        <div className="flex flex-col gap-8">
          {upcoming.length > 0 && <section aria-labelledby="upcoming-h"><h2 id="upcoming-h" className="mb-3 font-display text-xl font-semibold">{tr("Upcoming")}</h2>{list(upcoming)}</section>}
          {rest.length > 0 && <section aria-labelledby="past-h"><h2 id="past-h" className="mb-3 font-display text-xl font-semibold">{tr("Past and cancelled")}</h2>{list(rest)}</section>}
        </div>
      )}
    </SubpageFrame>
  );
}
