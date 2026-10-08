import Link from "next/link";
import type { Event } from "@prisma/client";
import { programLabel, formatEventDate } from "@/lib/format";

export default function EventStrip({ event }: { event: Event }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-stone/10 py-5">
      <div>
        <p className="font-body text-xs text-rust">{programLabel(event.program)}</p>
        <p className="font-display text-xl text-stone">
          <Link href={`/events/${event.slug}`} className="hover:text-rust">{event.name}</Link>
        </p>
        <p className="mt-1 font-body text-sm text-stone/60">{event.location}</p>
      </div>
      <div className="text-right">
        <p className="whitespace-nowrap font-body text-sm text-stone/70">{formatEventDate(event.eventDate)}</p>
        <Link href={`/events/${event.slug}`} className="mt-1 inline-block font-body text-sm text-rust underline">
          {event.ticketing === "FREE" ? "Free tickets →" : event.ticketing === "PAID" ? "Get tickets →" : "Details →"}
        </Link>
      </div>
    </div>
  );
}
