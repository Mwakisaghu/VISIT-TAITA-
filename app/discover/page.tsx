import type { Metadata } from "next";
import { DiscoverSkeleton } from "@/components/ui/Skeleton";
import { Suspense } from "react";
import { DiscoverChapters } from "@/components/discover/DiscoverChapters";
import Link from "next/link";
import ZoneLinks from "@/components/discover/ZoneLinks";
import { ZONES, zoneRange, type Zone } from "@/lib/field-guide";
import { shareMeta } from "@/lib/share-meta";

export const metadata: Metadata = {
  title: "Discover Taita",
  description: "Wild, culture, adventure, food, sport and people: six worlds in one hill country, in Taita Taveta, Kenya.",
  ...shareMeta("Discover Taita", "Wild, culture, adventure, food, sport and people: six worlds in one hill country, in Taita Taveta, Kenya."),
};

type SearchParams = Record<string, string | string[] | undefined>;

// `searchParams` is read with `await` so this page is correct on today's Next.js and on the next one (where it becomes a promise).
export default async function DiscoverPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const sp = (await searchParams) ?? {};
  const z = (Array.isArray(sp.zone) ? sp.zone[0] : sp.zone ?? "").toUpperCase();
  const zone = (ZONES as string[]).includes(z) ? (z as Zone) : null;


  return (
    <div>
      <section className="bg-stone px-6 pb-14 pt-16 text-parchment sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-ochre-light">Discover Taita</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-8">
            <h1 className="max-w-3xl font-display text-[clamp(2.072rem,5.18vw,3.885rem)] font-medium leading-[1.02] tracking-tight">Six worlds.<br />One hill country.</h1>
            <div className="max-w-sm">
              <p className="font-body text-base text-parchment/85">Every place here belongs to a world. Start with the one that pulls you, or let Taita choose for you.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/discover/surprise" prefetch={false} className="focus-ring inline-flex min-h-[44px] items-center rounded-[2px] bg-rust px-5 font-body text-[0.72rem] font-bold uppercase tracking-[0.18em] text-parchment hover:bg-rust-deep">Surprise me</Link>
                <Link href="/map" className="focus-ring inline-flex min-h-[44px] items-center rounded-[2px] border border-parchment/70 px-5 font-body text-[0.72rem] font-bold uppercase tracking-[0.18em] text-parchment">View on the map</Link>
              </div>
            </div>
          </div>
          <div className="mt-10"><ZoneLinks base="/discover" current={zone} tone="dark" /></div>
        </div>
      </section>

      {/* The places come from the database; the heading and the height filter above show at once. */}
      <Suspense key={zone ?? "all"} fallback={<DiscoverSkeleton />}>
        <DiscoverChapters zone={zone} />
      </Suspense>
    </div>
  );
}
