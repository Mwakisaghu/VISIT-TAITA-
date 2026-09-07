import type { Metadata } from "next";
import SectionHeading from "@/components/SectionHeading";
import EventStrip from "@/components/EventStrip";
import DemoNotice from "@/components/DemoNotice";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Events",
  description: "Taita Cup, Taita Week and Taita Sound — what's on in Taita Taveta.",
};

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
