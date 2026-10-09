import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import DemoNotice from "@/components/DemoNotice";
import StayCard from "@/components/stay/StayCard";
import StayFeature from "@/components/stay/StayFeature";
import StayFilters from "@/components/stay/StayFilters";
import { parseStayFilters, zoneRange } from "@/lib/field-guide";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/reviews-data";

export const metadata: Metadata = {
  title: "Stay in Taita",
  description: "Lodges, hotels, guesthouses, homestays and campsites across Taita Taveta, Kenya, each with a host you can name.",
};

type SearchParams = Record<string, string | string[] | undefined>;

// `searchParams` is read with `await` so this page is correct on today's Next.js and on the next one (where it becomes a promise).
export default async function StayPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const filters = parseStayFilters((await searchParams) ?? {});
  const filtered = !!(filters.type || filters.mood || filters.zone);

  const where: Prisma.AccommodationWhereInput = {
    status: "PUBLISHED",
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.mood ? { moods: { has: filters.mood } } : {}),
    ...(filters.zone ? { altitudeM: zoneRange(filters.zone) } : {}),
  };
  const accommodations = await prisma.accommodation.findMany({ where, orderBy: [{ featured: "desc" }, { name: "asc" }] });

  // One grouped query for the whole page — not one per card.
  const ratings = await getRatingSummaries("accommodation", accommodations.map((a) => a.id));
  const hasDemo = accommodations.some((a) => a.isDemo);
  const feature = !filtered ? accommodations.find((a) => a.featured) : undefined;
  const rest = feature ? accommodations.filter((a) => a.id !== feature.id) : accommodations;

  return (
    <div>
      <section className="bg-parchment px-6 pb-10 pt-16 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-rust-deep">Stay</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="max-w-3xl font-display text-[clamp(2.6rem,6vw,4.5rem)] font-medium leading-[1.04] tracking-tight text-stone">Stay somewhere that feels like part of the journey.</h1>
            <p className="max-w-xs font-body text-base text-stone/80">Every stay has a host you can name. Choose by how you want to feel, then by what it costs.</p>
          </div>
          <div className="mt-9"><StayFilters filters={filters} /></div>
        </div>
      </section>

      <section className="px-6 pb-20 pt-6">
        <div className="mx-auto max-w-6xl">
          {accommodations.length > 0 ? (
            <>
              {feature && <div className="mb-10"><StayFeature stay={feature} /></div>}
              <p className="font-body text-sm text-stone/70" role="status">{accommodations.length} stay{accommodations.length === 1 ? "" : "s"}{filtered ? " match" : ""}</p>
              {rest.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {rest.map((a) => <StayCard key={a.slug} stay={a} rating={ratings.get(a.id) ?? null} />)}
                </div>
              )}
            </>
          ) : (
            <div className="mt-6 rounded-[2px] border border-stone/20 p-8">
              <p className="font-display text-2xl text-stone">{filtered ? "Nothing matches those filters yet." : "No stays published yet."}</p>
              {filtered && <Link href="/stay" className="focus-ring mt-4 inline-block font-body text-sm font-semibold text-rust-deep underline underline-offset-4">Clear filters and see everything</Link>}
            </div>
          )}
          {hasDemo && (
            <div className="mt-10">
              <DemoNotice>sample listings for layout review — rates and availability aren&apos;t verified.</DemoNotice>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
