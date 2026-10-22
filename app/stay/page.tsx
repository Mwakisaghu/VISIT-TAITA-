import type { Metadata } from "next";
import { StaysSkeleton } from "@/components/ui/Skeleton";
import { Suspense } from "react";
import { StayResults } from "@/components/stay/StayResults";
import StayFilters from "@/components/stay/StayFilters";
import { parseStayFilters, zoneRange } from "@/lib/field-guide";
import { prisma } from "@/lib/prisma";
import { shareMeta } from "@/lib/share-meta";

export const metadata: Metadata = {
  title: "Stay in Taita",
  description: "Lodges, hotels, guesthouses, homestays and campsites across Taita Taveta, Kenya, each with a host you can name.",
  ...shareMeta("Stay in Taita", "Lodges, hotels, guesthouses, homestays and campsites across Taita Taveta, Kenya, each with a host you can name."),
};

type SearchParams = Record<string, string | string[] | undefined>;

// `searchParams` is read with `await` so this page is correct on today's Next.js and on the next one (where it becomes a promise).
export default async function StayPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const filters = parseStayFilters((await searchParams) ?? {});

  return (
    <div>
      <section className="bg-parchment px-6 pb-10 pt-16 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-rust-deep">Stay</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="max-w-3xl font-display text-[clamp(1.924rem,4.44vw,3.33rem)] font-medium leading-[1.04] tracking-tight text-stone">Stay somewhere that feels like part of the journey.</h1>
            <p className="max-w-xs font-body text-base text-stone/80">Every stay has a host you can name. Choose by how you want to feel, then by what it costs.</p>
          </div>
          <div className="mt-9"><StayFilters filters={filters} /></div>
        </div>
      </section>

      {/* The stays come from the database; the heading and filters above show at once. */}
      <Suspense key={JSON.stringify(filters)} fallback={<StaysSkeleton withFeature={!(filters.type || filters.mood || filters.zone)} />}>
        <StayResults filters={filters} />
      </Suspense>
    </div>
  );
}
