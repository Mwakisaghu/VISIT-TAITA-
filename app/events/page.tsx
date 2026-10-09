import type { Metadata } from "next";
import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";
import EventFilters from "@/components/events/EventFilters";
import EventRow from "@/components/events/EventRow";
import { eventWhere, groupEvents, parseEventFilters } from "@/lib/events-view";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Events",
  description: "Taita Cup, Taita Week and Taita Sound — what's on in Taita Taveta, Kenya.",
};

type SearchParams = Record<string, string | string[] | undefined>;

// `searchParams` is read with `await` so this page is correct on today's Next.js and on the next one (where it becomes a promise).
export default async function EventsPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const filters = parseEventFilters((await searchParams) ?? {});
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
    <div>
      <section className="bg-parchment px-6 pb-8 pt-16 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-rust-deep">Events in Taita</p>
          <h1 className="mt-4 font-display text-[clamp(2.8rem,7vw,5rem)] font-medium leading-[1.02] tracking-tight text-stone">What&apos;s on.</h1>
          <div className="mt-8"><EventFilters filters={filters} /></div>
        </div>
      </section>

      <section className="px-6 pb-20 pt-6">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.9fr_1fr]">
          <div>
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
          </div>

          <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[2px] bg-canopy p-6 text-parchment">
              <p className="font-body text-[0.7rem] font-bold uppercase tracking-[0.24em] text-ochre-light">Taita Cup</p>
              <p className="mt-3 font-display text-2xl leading-snug">Come for the football. Stay for Taita.</p>
              <Link href="/events/taita-cup" className="focus-ring mt-5 inline-flex min-h-[44px] items-center rounded-[2px] border border-parchment/70 px-5 font-body text-[0.72rem] font-bold uppercase tracking-[0.18em]">Standings and fixtures</Link>
            </div>
            <div className="rounded-[2px] border border-stone/20 p-6">
              <p className="font-body text-[0.7rem] font-bold uppercase tracking-[0.24em] text-rust-deep">Taita Week</p>
              <p className="mt-3 font-display text-xl leading-snug text-stone">A week of things to do across the hills.</p>
              <Link href="/events/taita-week" className="focus-ring mt-4 inline-flex min-h-[44px] items-center font-body text-sm font-semibold text-stone underline underline-offset-4">Full programme</Link>
            </div>
            <p className="font-body text-sm text-stone/75">Going with friends? Every event can be sent to a WhatsApp group in one tap, or added to your calendar.</p>
          </aside>
        </div>
      </section>
    </div>
  );
}
