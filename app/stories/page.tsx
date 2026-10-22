import type { Metadata } from "next";
import { StoriesSkeleton } from "@/components/ui/Skeleton";
import { Suspense } from "react";
import { StoryResults } from "@/components/stories/StoryResults";
import StoryFilters from "@/components/stories/StoryFilters";
import { action, blurb, headline, kicker } from "@/components/stories/type";
import { parseStoryFilters } from "@/lib/stories-view";
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

      {/* The stories come from the database. The heading and filters above show at once; a placeholder of the same shape holds the stories' place until they arrive. */}
      <Suspense key={JSON.stringify(filters)} fallback={<StoriesSkeleton withFeature={!filters.type} />}>
        <StoryResults filters={filters} />
      </Suspense>
    </div>
  );
}
