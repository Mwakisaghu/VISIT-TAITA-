import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";
import StoryCard from "@/components/StoryCard";
import Tag from "@/components/field/Tag";
import GoThereRow from "@/components/stories/GoThereRow";
import StoryBody from "@/components/stories/StoryBody";
import WherePanel from "@/components/stories/WherePanel";
import { categoryLabel } from "@/lib/format";
import { canOptimize } from "@/lib/image-src";
import { prisma } from "@/lib/prisma";
import { getStoryLoop } from "@/lib/story-data";
import { parseStoryBody } from "@/lib/stories-view";

type Ctx = { params: Promise<{ slug: string }> | { slug: string } };

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
    openGraph: { images: [story.image] },
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
    <article className="px-6 py-14 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <Link href="/stories" className="focus-ring font-body text-sm text-stone/70 hover:text-rust-deep">← All stories</Link>
        <div className="mt-6 flex flex-wrap gap-2"><Tag tone="rust">{categoryLabel(story.category)}</Tag><Tag>{story.readingTime}</Tag></div>
        <h1 className="mt-5 max-w-4xl font-display text-[clamp(2.4rem,6vw,4.25rem)] font-medium leading-[1.05] tracking-tight text-stone">{story.title}</h1>
        {byline && (
          <p className="mt-4 font-body text-sm text-stone/80">
            By{" "}
            <Link href={`/creators/${byline.slug}`} className="underline hover:text-rust-deep">{byline.displayName}</Link>
          </p>
        )}

        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[2px] bg-canopy-deep">
          <Image src={story.image} alt="" fill unoptimized={!canOptimize(story.image)} priority sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />
        </div>

        <div className="mt-12 grid gap-14 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="max-w-prose">
            <p className="font-display text-2xl leading-snug text-stone/85">{story.excerpt}</p>
            <div className="mt-8">
              {blocks.length > 0 ? (
                <StoryBody blocks={blocks} />
              ) : (
                <p className="font-body text-lg text-stone/70">
                  Full story text will be added once the reporting for this piece is complete. This placeholder holds the layout — hero image, byline, reading time and related stories — so the editorial template can be reviewed ahead of real content.
                </p>
              )}
            </div>
            {story.isDemo && <div className="mt-8"><DemoNotice>placeholder article body, not a published story.</DemoNotice></div>}
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            {story.destination && <WherePanel place={story.destination} />}
            <section aria-labelledby="notes-title" className="rounded-[2px] border border-stone/15 p-6">
              <p id="notes-title" className="font-display text-xl leading-snug text-stone">Been here? Read and add field notes.</p>
              <p className="mt-2 font-body text-sm text-stone/80">A line, a photo, a tip from people who have been.</p>
              <Link href="/notes" className="focus-ring mt-4 inline-flex min-h-[44px] items-center font-body text-sm font-semibold text-stone underline underline-offset-4">Open field notes<span aria-hidden="true">&nbsp;→</span></Link>
            </section>
          </aside>
        </div>

        <GoThereRow place={story.destination} stay={loop.stay} experience={loop.experience} now={now} />

        {related.length > 0 && (
          <div className="mt-16 border-t border-stone/10 pt-10">
            <p className="font-display text-2xl text-stone">More stories</p>
            <div className="mt-6 grid gap-8 sm:grid-cols-2">
              {related.map((s) => <StoryCard key={s.slug} story={s} />)}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
