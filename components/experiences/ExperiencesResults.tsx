import Link from "next/link";
import type { Prisma } from "@prisma/client";
import DemoNotice from "@/components/DemoNotice";
import ExperienceCover from "@/components/experiences/ExperienceCover";
import { parseExperienceFilters, weekendWindow } from "@/lib/field-guide";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/reviews-data";

export async function ExperiencesResults({ filters }: { filters: ReturnType<typeof parseExperienceFilters> }) {
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
    <section className="px-6 pb-20 pt-6">
      <div className="mx-auto max-w-6xl">
      {experiences.length > 0 ? (
        <>
          <p className="font-body text-sm text-stone/80" role="status">{experiences.length} experience{experiences.length === 1 ? "" : "s"}{filtered ? " match" : ""}</p>
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
  );
}
