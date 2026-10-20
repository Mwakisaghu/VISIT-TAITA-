import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";
import StoryCard from "@/components/StoryCard";
import GoThereRow from "@/components/stories/GoThereRow";
import StoryBody from "@/components/stories/StoryBody";
import { action, blurb, headline, kicker, measure, meta, prose, space, standfirst } from "@/components/stories/type";
import WherePanel from "@/components/stories/WherePanel";
import { categoryLabel } from "@/lib/format";
import { canOptimize } from "@/lib/image-src";
import PhotoCredit from "@/components/PhotoCredit";
import { isApprovedStoryPicture, storyPicture } from "@/lib/story-picture";
import { prisma } from "@/lib/prisma";
import { getStoryLoop } from "@/lib/story-data";
import { parseStoryBody } from "@/lib/stories-view";
import StoryCredits from "@/components/stories/StoryCredits";
import ShareBar from "@/components/share/ShareBar";

type Ctx = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const stories = await prisma.story.findMany({ select: { slug: true } });
  return stories.map((s) => ({ slug: s.slug }));
}

// `params` is read with `await` so this page is correct on today's Next.js and on the next one (where it becomes a promise).
export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { slug } = await params;
  const story = await prisma.story.findUnique({ where: { slug } });
  if (!story) return {};
  return {
    title: story.title,
    description: story.excerpt,
    openGraph: isApprovedStoryPicture(story.image) && !story.image.startsWith("/") ? { images: [story.image] } : {}, // a borrowed or placeholder picture is never offered as the share preview
  };
}

export const revalidate = 60;

export default async function StoryPage({ params }: Ctx) {
  const { slug } = await params;
  const story = await prisma.story.findUnique({
    where: { slug },
    include: {
      author: { select: { creator: { select: { slug: true, displayName: true, status: true } } } },
      destination: { select: { name: true, region: true, category: true, image: true, altitudeM: true } },
    },
  });
  if (!story || story.status !== "PUBLISHED") notFound();

  // Credit the author only when they are an ACTIVE Field Crew member — never expose a staff account name.
  const byline = story.author?.creator?.status === "ACTIVE" ? story.author.creator : null;

  const now = new Date();
  const [related, loop] = await Promise.all([
    prisma.story.findMany({ where: { status: "PUBLISHED", slug: { not: story.slug } }, take: 2, orderBy: { createdAt: "desc" } }),
    getStoryLoop(story.destination?.region, now),
  ]);
  const blocks = parseStoryBody(story.body);

  return (
    <article className={`px-6 ${space.section}`}>
      <div className="mx-auto max-w-6xl">
        <Link href="/stories" className={`focus-ring ${meta} text-stone/80 hover:text-rust-deep`}>← All stories</Link>
        <p className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-1"><span className={`${kicker} text-rust-deep`}>{categoryLabel(story.category)}</span><span className={`${meta} text-stone/80`}>{story.readingTime}</span></p>
        <h1 className={`mt-4 max-w-4xl text-stone ${headline.page}`}>{story.title}</h1>
        <p className={`${standfirst} mt-6 max-w-2xl text-stone/85`}>{story.excerpt}</p>
        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
          <ShareBar />
        {byline && (
          <p className={`${meta} text-stone/80`}>
            By{" "}
            <Link href={`/creators/${byline.slug}`} className="underline hover:text-rust-deep">{byline.displayName}</Link>
          </p>
        )}
        </div>

        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[2px] bg-canopy-deep">
          <Image src={storyPicture(story.image)} alt="" fill unoptimized={!canOptimize(storyPicture(story.image))} priority sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />
          <PhotoCredit credit={story.imageCredit} />
        </div>

        <div className={`${space.block} grid gap-16 lg:grid-cols-[minmax(0,1fr)_20rem]`}>
          <div className={measure}>
            <div>
              {blocks.length > 0 ? (
                <StoryBody blocks={blocks} />
              ) : (
                <p className={`${prose} text-stone/80`}>
                  Full story text will be added once the reporting for this piece is complete. This placeholder holds the layout — hero image, byline, reading time and related stories — so the editorial template can be reviewed ahead of real content.
                </p>
              )}
            </div>
            <StoryCredits credits={story.credits} />
            {story.isDemo && <div className="mt-8"><DemoNotice>placeholder article body, not a published story.</DemoNotice></div>}
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            {story.destination && <WherePanel place={story.destination} />}
            <section aria-labelledby="notes-title" className="rounded-[2px] border border-stone/15 p-6">
              <p id="notes-title" className={`text-stone ${headline.small}`}>Been here? Read and add field notes.</p>
              <p className={`${blurb} mt-3 text-stone/80`}>A line, a photo, a tip from people who have been.</p>
              <Link href="/notes" className={`${action} mt-3 text-stone hover:text-rust-deep`}>Open field notes<span aria-hidden="true">&nbsp;→</span></Link>
            </section>
          </aside>
        </div>

        {/* the place itself is shown in "Where this happened" above, so it is not repeated here */}
        <GoThereRow place={null} stay={loop.stay} experience={loop.experience} now={now} />

        {related.length > 0 && (
          <div className="mt-20 border-t border-stone/15 pt-12">
            <h2 className={`text-stone ${headline.small}`}>More stories</h2>
            <div className="mt-8 grid gap-10 sm:grid-cols-2">
              {related.map((s) => <StoryCard key={s.slug} story={s} />)}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
