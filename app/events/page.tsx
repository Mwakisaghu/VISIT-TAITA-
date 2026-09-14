import type { Metadata } from "next";
import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";
import EventStrip from "@/components/EventStrip";
import DemoNotice from "@/components/DemoNotice";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Events",
  description: "Taita Cup, Taita Week and Taita Sound — what's on in Taita Taveta.",
};

export const revalidate = 60;

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { eventDate: "asc" },
  });
  const hasDemo = events.some((e) => e.isDemo);

  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          title="Events in Taita"
          description="Taita Cup, Taita Week and Taita Sound, in one place."
        />

        <Link
          href="/events/taita-cup"
          className="focus-ring mt-6 inline-block rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust"
        >
          Full Taita Cup standings & fixtures →
        </Link>

        {events.length > 0 ? (
          <div className="mt-10">
            {events.map((event) => (
              <EventStrip key={event.slug} event={event} />
            ))}
          </div>
        ) : (
          <p className="mt-10 font-body text-stone/60">No events published yet.</p>
        )}

        {hasDemo && (
          <div className="mt-8">
            <DemoNotice>sample fixtures — dates to be confirmed with organisers.</DemoNotice>
          </div>
        )}
      </div>
    </div>
  );
}
