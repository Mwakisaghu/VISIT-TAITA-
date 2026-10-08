import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import DemoNotice from "@/components/DemoNotice";
import ExperienceCover from "@/components/experiences/ExperienceCover";
import ExperienceFilters from "@/components/experiences/ExperienceFilters";
import { parseExperienceFilters, weekendWindow } from "@/lib/field-guide";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/reviews-data";

export const metadata: Metadata = {
  title: "Experiences",
  description: "Guided hikes, forest walks, food tours and cultural workshops across Taita Taveta, Kenya, led by the people who know them best.",
};

type SearchParams = Record<string, string | string[] | undefined>;

// `searchParams` is read with `await` so this page is correct on today's Next.js and on the next one (where it becomes a promise).
export default async function ExperiencesPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const filters = parseExperienceFilters((await searchParams) ?? {});
  const now = new Date();
  const { from, to } = weekendWindow(now);

  const where: Prisma.ExperienceWhereInput = {
    status: "PUBLISHED",
    ...(filters.type ? { category: filters.type } : {}),
    ...(filters.level ? { difficulty: filters.level } : {}),
    ...(filters.weekend ? { sessions: { some: { status: "OPEN", startsAt: { gt: now, gte: from, lt: to } } } } : {}),
  };

  const experiences = await prisma.experience.findMany({
    where,
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    include: { sessions: { where: { status: "OPEN", startsAt: { gt: now } }, orderBy: { startsAt: "asc" }, take: 3, select: { startsAt: true, capacity: true, seatsTaken: true, status: true } } },
  });

  // One grouped query for the whole page — not one per card.
  const ratings = await getRatingSummaries("experience", experiences.map((x) => x.id));
  const hasDemo = experiences.some((x) => x.isDemo);
  const filtered = !!(filters.type || filters.level || filters.weekend);

  return (
    <div>
      <section className="bg-parchment px-6 pb-10 pt-16 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-rust-deep">Experiences</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="max-w-3xl font-display text-[clamp(2.6rem,6vw,4.5rem)] font-medium leading-[1.04] tracking-tight text-stone">Led by the people who know the way.</h1>
            <p className="max-w-xs font-body text-base text-stone/80">Every experience shows its next dates, who leads it, and how hard the climb is before you book.</p>
          </div>
          <div className="mt-9"><ExperienceFilters filters={filters} /></div>
        </div>
      </section>

      <section className="px-6 pb-20 pt-6">
        <div className="mx-auto max-w-6xl">
        {experiences.length > 0 ? (
          <>
            <p className="font-body text-sm text-stone/70" role="status">{experiences.length} experience{experiences.length === 1 ? "" : "s"}{filtered ? " match" : ""}</p>
            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {experiences.map((x) => (
                <ExperienceCover key={x.slug} experience={x} sessions={x.sessions} rating={ratings.get(x.id) ?? null} now={now} />
              ))}
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-[2px] border border-stone/20 p-8">
            <p className="font-display text-2xl text-stone">{filtered ? "Nothing matches those filters yet." : "No experiences published yet."}</p>
            {filtered && <Link href="/experiences" className="focus-ring mt-4 inline-block font-body text-sm font-semibold text-rust-deep underline underline-offset-4">Clear filters and see everything</Link>}
          </div>
        )}
        {hasDemo && (
          <div className="mt-10">
            <DemoNotice>sample listings for layout review — prices and availability aren&apos;t verified.</DemoNotice>
          </div>
        )}
        </div>
      </section>
    </div>
  );
}
