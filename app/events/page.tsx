import type { Metadata } from "next";
import SectionHeading from "@/components/SectionHeading";
import EventStrip from "@/components/EventStrip";
import DemoNotice from "@/components/DemoNotice";
import { events } from "@/lib/data";

export const metadata: Metadata = {
  title: "Events",
  description: "Taita Cup, Taita Week and Taita Sound — what's on in Taita Taveta.",
};

export default function EventsPage() {
  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          title="Events in Taita"
          description="Taita Cup, Taita Week and Taita Sound, in one place."
        />

        <div className="mt-10">
          {events.map((event) => (
            <EventStrip key={event.slug} event={event} />
          ))}
        </div>

        <div className="mt-8">
          <DemoNotice>sample fixtures — dates to be confirmed with organisers.</DemoNotice>
        </div>
      </div>
    </div>
  );
}
