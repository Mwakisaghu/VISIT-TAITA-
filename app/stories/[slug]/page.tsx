import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import DemoNotice from "@/components/DemoNotice";
import StoryCard from "@/components/StoryCard";
import { categoryLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function generateStaticParams() {
  const stories = await prisma.story.findMany({ select: { slug: true } });
  return stories.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const story = await prisma.story.findUnique({ where: { slug: params.slug } });
  if (!story) return {};
  return {
    title: story.title,
    description: story.excerpt,
    openGraph: { images: [story.image] },
  };
}

export const revalidate = 60;

export default async function StoryPage({ params }: { params: { slug: string } }) {
  const story = await prisma.story.findUnique({ where: { slug: params.slug } });
  if (!story || story.status !== "PUBLISHED") notFound();

  const related = await prisma.story.findMany({
    where: { status: "PUBLISHED", slug: { not: story.slug } },
    take: 2,
    orderBy: { createdAt: "desc" },
  });

  return (
    <article className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <p className="font-body text-xs text-rust">{categoryLabel(story.category)}</p>
        <h1 className="mt-3 font-display text-4xl text-stone sm:text-5xl">
          {story.title}
        </h1>
        <p className="mt-4 font-body text-sm text-stone/60">{story.readingTime}</p>

        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-sm">
          <Image
            src={story.image}
            alt={story.title}
            fill
            unoptimized
            priority
            sizes="(min-width: 768px) 768px, 100vw"
            className="object-cover"
          />
        </div>

        <div className="mt-8 max-w-prose font-body text-lg leading-relaxed text-stone/85">
          <p>{story.excerpt}</p>
          {story.body ? (
            <p className="mt-6 whitespace-pre-line">{story.body}</p>
          ) : (
            <p className="mt-6 text-stone/60">
              Full story text will be added once the reporting for this piece
              is complete. This placeholder holds the layout — hero image,
              byline, reading time and related stories — so the editorial
              template can be reviewed ahead of real content.
            </p>
          )}
        </div>

        {story.isDemo && (
          <DemoNotice>placeholder article body, not a published story.</DemoNotice>
        )}

        {related.length > 0 && (
          <div className="mt-16 border-t border-stone/10 pt-10">
            <p className="font-display text-2xl text-stone">More stories</p>
            <div className="mt-6 grid gap-8 sm:grid-cols-2">
              {related.map((s) => (
                <StoryCard key={s.slug} story={s} />
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
