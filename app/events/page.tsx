import type { Metadata } from "next";
import { EventListSkeleton } from "@/components/ui/Skeleton";
import { Suspense } from "react";
import { EventList } from "@/components/events/EventList";
import Link from "next/link";
import EventFilters from "@/components/events/EventFilters";
import { eventWhere, groupEvents, parseEventFilters } from "@/lib/events-view";
import { shareMeta } from "@/lib/share-meta";

export const metadata: Metadata = {
  title: "Events",
  description: "Taita Cup, Taita Week and Taita Sound — what's on in Taita Taveta, Kenya.",
  ...shareMeta("Events", "Taita Cup, Taita Week and Taita Sound — what's on in Taita Taveta, Kenya."),
};

type SearchParams = Record<string, string | string[] | undefined>;

// `searchParams` is read with `await` so this page is correct on today's Next.js and on the next one (where it becomes a promise).
export default async function EventsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const filters = parseEventFilters((await searchParams) ?? {});

  return (
    <div>
      <section className="bg-parchment px-6 pb-8 pt-16 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-rust-deep">Events in Taita</p>
          <h1 className="mt-4 font-display text-[clamp(2.072rem,5.18vw,3.7rem)] font-medium leading-[1.02] tracking-tight text-stone">What&apos;s on.</h1>
          <div className="mt-8"><EventFilters filters={filters} /></div>
        </div>
      </section>

      <section className="px-6 pb-20 pt-6">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.9fr_1fr]">
          <div>
            {/* The events come from the database; the heading, the filters and the side column show at once. */}
            <Suspense key={JSON.stringify(filters)} fallback={<EventListSkeleton />}>
              <EventList filters={filters} />
            </Suspense>
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
