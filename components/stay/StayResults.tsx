import Link from "next/link";
import type { Prisma } from "@prisma/client";
import DemoNotice from "@/components/DemoNotice";
import StayCard from "@/components/stay/StayCard";
import StayFeature from "@/components/stay/StayFeature";
import { parseStayFilters, zoneRange } from "@/lib/field-guide";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/reviews-data";

export async function StayResults({ filters }: { filters: ReturnType<typeof parseStayFilters> }) {
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
    <section className="px-6 pb-20 pt-6">
      <div className="mx-auto max-w-6xl">
        {accommodations.length > 0 ? (
          <>
            {feature && <div className="mb-10"><StayFeature stay={feature} /></div>}
            <p className="font-body text-sm text-stone/80" role="status">{accommodations.length} stay{accommodations.length === 1 ? "" : "s"}{filtered ? " match" : ""}</p>
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
  );
}
