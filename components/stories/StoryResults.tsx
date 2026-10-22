import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";
import StoryCover from "@/components/stories/StoryCover";
import { action, blurb, headline, kicker } from "@/components/stories/type";
import { parseStoryFilters } from "@/lib/stories-view";
import { prisma } from "@/lib/prisma";

export async function StoryResults({ filters }: { filters: ReturnType<typeof parseStoryFilters> }) {
  const stories = await prisma.story.findMany({
    where: { status: "PUBLISHED", ...(filters.type ? { category: filters.type } : {}) },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    include: { destination: { select: { name: true } } },
  });
  const hasDemo = stories.some((s) => s.isDemo);
  const feature = !filters.type ? stories.find((s) => s.featured) : undefined;
  const rest = feature ? stories.filter((s) => s.id !== feature.id) : stories;

  return (
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
  );
}
