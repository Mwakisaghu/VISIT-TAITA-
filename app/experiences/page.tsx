import type { Metadata } from "next";
import { ExperiencesSkeleton } from "@/components/ui/Skeleton";
import { Suspense } from "react";
import { ExperiencesResults } from "@/components/experiences/ExperiencesResults";
import Link from "next/link";
import ExperienceFilters from "@/components/experiences/ExperienceFilters";
import { parseExperienceFilters, weekendWindow } from "@/lib/field-guide";
import { prisma } from "@/lib/prisma";
import { shareMeta } from "@/lib/share-meta";

export const metadata: Metadata = {
  title: "Experiences",
  description: "Guided hikes, forest walks, food tours and cultural workshops across Taita Taveta, Kenya, led by the people who know them best.",
  ...shareMeta("Experiences", "Guided hikes, forest walks, food tours and cultural workshops across Taita Taveta, Kenya, led by the people who know them best."),
};

type SearchParams = Record<string, string | string[] | undefined>;

// `searchParams` is read with `await` so this page is correct on today's Next.js and on the next one (where it becomes a promise).
export default async function ExperiencesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const filters = parseExperienceFilters((await searchParams) ?? {});

  return (
    <div>
      <section className="bg-parchment px-6 pb-10 pt-16 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-rust-deep">Experiences</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="max-w-3xl font-display text-[clamp(1.924rem,4.44vw,3.33rem)] font-medium leading-[1.04] tracking-tight text-stone">Led by the people who know the way.</h1>
            <p className="max-w-xs font-body text-base text-stone/80">Every experience shows its next dates, who leads it, and how hard the climb is before you book.</p>
          </div>
          <div className="mt-9"><ExperienceFilters filters={filters} /></div>
          <p className="mt-6 font-body text-sm text-stone/85">Want to line a few of these up with a stay and an event? <Link href="/plan" className="focus-ring font-semibold text-rust-deep underline underline-offset-4">Build your Taita day</Link>.</p>
        </div>
      </section>

      {/* The experiences come from the database; the heading and filters above show at once. */}
      <Suspense key={JSON.stringify(filters)} fallback={<ExperiencesSkeleton />}>
        <ExperiencesResults filters={filters} />
      </Suspense>
    </div>
  );
}
