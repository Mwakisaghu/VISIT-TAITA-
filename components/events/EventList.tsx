import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";
import EventRow from "@/components/events/EventRow";
import { eventWhere, groupEvents, parseEventFilters } from "@/lib/events-view";
import { prisma } from "@/lib/prisma";

export async function EventList({ filters }: { filters: ReturnType<typeof parseEventFilters> }) {
  const now = new Date();
  const filtered = !!(filters.when || filters.program || filters.free);
  const past = filters.when === "past";

  const events = await prisma.event.findMany({
    where: eventWhere(filters, now),
    orderBy: { eventDate: past ? "desc" : "asc" },
    include: { organiser: { select: { name: true } } },
  });
  const groups = past ? (events.length ? [{ key: "past", label: "Past events", items: events }] : []) : groupEvents(events, now);
  const hasDemo = events.some((e) => e.isDemo);
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL;

  return (
    <>
      {groups.length > 0 ? (
        groups.map((g) => (
          <section key={g.key} aria-labelledby={`g-${g.key}`} className="mb-10">
            <h2 id={`g-${g.key}`} className="font-body text-[0.7rem] font-bold uppercase tracking-[0.24em] text-stone/75">{g.label}</h2>
            <div className="mt-3">{g.items.map((e) => <EventRow key={e.slug} event={e} now={now} siteUrl={siteUrl} />)}</div>
          </section>
        ))
      ) : (
        <div className="rounded-[2px] border border-stone/20 p-8">
          <p className="font-display text-2xl text-stone">{filtered ? "Nothing matches those filters yet." : "No upcoming events yet."}</p>
          <Link href={filtered ? "/events" : "/events?when=past"} className="focus-ring mt-4 inline-block font-body text-sm font-semibold text-rust-deep underline underline-offset-4">{filtered ? "Clear filters and see everything" : "See past events"}</Link>
        </div>
      )}
      {hasDemo && <div className="mt-2"><DemoNotice>sample fixtures — dates to be confirmed with organisers.</DemoNotice></div>}
    </>
  );
}
