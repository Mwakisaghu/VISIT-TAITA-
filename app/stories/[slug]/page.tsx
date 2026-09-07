import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DemoNotice from "@/components/DemoNotice";
import StoryCard from "@/components/StoryCard";
import { stories } from "@/lib/data";

export function generateStaticParams() {
  return stories.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const story = stories.find((s) => s.slug === params.slug);
  if (!story) return {};
  return {
    title: story.title,
    description: story.excerpt,
    openGraph: { images: [story.image] },
  };
}

export default function StoryPage({ params }: { params: { slug: string } }) {
  const story = stories.find((s) => s.slug === params.slug);
  if (!story) notFound();

  const related = stories.filter((s) => s.slug !== story.slug).slice(0, 2);

  return (
    <article className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <p className="font-body text-xs text-rust">{story.category}</p>
        <h1 className="mt-3 font-display text-4xl text-stone sm:text-5xl">
          {story.title}
        </h1>
        <p className="mt-4 font-body text-sm text-stone/60">{story.readingTime}</p>

        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-sm">
          <img src={story.image} alt={story.title} className="h-full w-full object-cover" />
        </div>

        <div className="mt-8 max-w-prose font-body text-lg leading-relaxed text-stone/85">
          <p>{story.excerpt}</p>
          <p className="mt-6 text-stone/60">
            Full story text will be added once the reporting for this piece is
            complete. This placeholder holds the layout — hero image, byline,
            reading time and related stories — so the editorial template can
            be reviewed ahead of real content.
          </p>
        </div>

        <DemoNotice>placeholder article body, not a published story.</DemoNotice>

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
