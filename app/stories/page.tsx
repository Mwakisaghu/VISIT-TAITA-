import type { Metadata } from "next";
import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";
import StoryCover from "@/components/stories/StoryCover";
import StoryFilters from "@/components/stories/StoryFilters";
import { parseStoryFilters } from "@/lib/stories-view";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Taita Stories",
  description: "People, places, culture, sport and adventure from Taita Taveta, told by the people who live there.",
};

type SearchParams = Record<string, string | string[] | undefined>;

// `searchParams` is read with `await` so this page is correct on today's Next.js and on the next one (where it becomes a promise).
export default async function StoriesPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const filters = parseStoryFilters((await searchParams) ?? {});
  const stories = await prisma.story.findMany({
    where: { status: "PUBLISHED", ...(filters.type ? { category: filters.type } : {}) },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    include: { destination: { select: { name: true } } },
  });
  const hasDemo = stories.some((s) => s.isDemo);
  const feature = !filters.type ? stories.find((s) => s.featured) : undefined;
  const rest = feature ? stories.filter((s) => s.id !== feature.id) : stories;

  return (
    <div>
      <section className="bg-parchment px-6 pb-8 pt-16 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-rust-deep">Taita stories</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="max-w-3xl font-display text-[clamp(2.6rem,6vw,4.5rem)] font-medium leading-[1.04] tracking-tight text-stone">Real people. Extraordinary stories.</h1>
            <p className="max-w-xs font-body text-base text-stone/80">The people, culture and places behind the postcard.</p>
          </div>
          <div className="mt-9"><StoryFilters filters={filters} /></div>
        </div>
      </section>

      <section className="px-6 pb-20 pt-6">
        <div className="mx-auto max-w-6xl">
          {stories.length > 0 ? (
            <>
              {feature && <div className="mb-8"><StoryCover story={feature} large /></div>}
              {rest.length > 0 && (
                <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
                  {rest.map((s) => <div key={s.slug} className="mb-6 break-inside-avoid"><StoryCover story={s} /></div>)}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[2px] border border-stone/20 p-8">
              <p className="font-display text-2xl text-stone">{filters.type ? "No stories like that yet." : "No stories published yet."}</p>
              {filters.type && <Link href="/stories" className="focus-ring mt-4 inline-block font-body text-sm font-semibold text-rust-deep underline underline-offset-4">See all stories</Link>}
            </div>
          )}
          {hasDemo && <div className="mt-10"><DemoNotice>replace with verified editorial before launch.</DemoNotice></div>}
        </div>
      </section>
    </div>
  );
}
