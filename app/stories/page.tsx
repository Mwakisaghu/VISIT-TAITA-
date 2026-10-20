import type { Metadata } from "next";
import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";
import StoryCover from "@/components/stories/StoryCover";
import StoryFilters from "@/components/stories/StoryFilters";
import { action, blurb, headline, kicker } from "@/components/stories/type";
import { parseStoryFilters } from "@/lib/stories-view";
import { prisma } from "@/lib/prisma";
import { shareMeta } from "@/lib/share-meta";

export const metadata: Metadata = {
  title: "Taita Stories",
  description: "People, places, culture, sport and adventure from Taita Taveta, told by the people who live there.",
  ...shareMeta("Taita Stories", "People, places, culture, sport and adventure from Taita Taveta, told by the people who live there."),
};

type SearchParams = Record<string, string | string[] | undefined>;

// `searchParams` is read with `await` so this page is correct on today's Next.js and on the next one (where it becomes a promise).
export default async function StoriesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
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
      <section className="bg-parchment px-6 pb-10 pt-20 sm:pt-28">
        <div className="mx-auto max-w-6xl">
          <p className={`${kicker} text-rust-deep`}>Taita stories</p>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
            <h1 className={`max-w-3xl text-stone ${headline.page}`}>Real people. Extraordinary stories.</h1>
            <p className={`${blurb} max-w-[34ch] text-stone/80`}>The people, culture and places behind the postcard.</p>
          </div>
          <div className="mt-10"><StoryFilters filters={filters} /></div>
        </div>
      </section>

      <section className="px-6 pb-24 pt-8">
        <div className="mx-auto max-w-6xl">
          {stories.length > 0 ? (
            <>
              {feature && <div className="mb-10"><StoryCover story={feature} large /></div>}
              {rest.length > 0 && (
                <div className="columns-1 gap-8 sm:columns-2 lg:columns-3">
                  {rest.map((s) => <div key={s.slug} className="mb-8 break-inside-avoid"><StoryCover story={s} /></div>)}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[2px] border border-stone/20 p-8">
              <p className={`text-stone ${headline.small}`}>{filters.type ? "No stories like that yet." : "No stories published yet."}</p>
              {filters.type && <Link href="/stories" className={`${action} mt-3 text-rust-deep hover:text-stone`}>See all stories</Link>}
            </div>
          )}
          {hasDemo && <div className="mt-10"><DemoNotice>replace with verified editorial before launch.</DemoNotice></div>}
        </div>
      </section>
    </div>
  );
}
