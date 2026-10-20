import Link from "next/link";
import Image from "next/image";
import type { Story } from "@prisma/client";
import PhotoCredit from "@/components/PhotoCredit";
import { blurb, headline, kicker, meta } from "@/components/stories/type";
import { categoryLabel } from "@/lib/format";
import { canOptimize } from "@/lib/image-src";
import { storyPicture } from "@/lib/story-picture";

/** A story as a card: the picture, then a label, the headline, a description and the small facts, in the same order as a cover. */
export default function StoryCard({ story, size = "regular" }: { story: Story; size?: "regular" | "large" }) {
  const src = storyPicture(story.image);
  return (
    <Link href={`/stories/${story.slug}`} className="focus-ring group block">
      <div className={`relative overflow-hidden rounded-sm bg-stone/10 ${size === "large" ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
        <Image
          src={src}
          alt={story.title}
          fill
          unoptimized={!canOptimize(src)}
          sizes={size === "large" ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 640px) 33vw, 100vw"}
          className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
        />
        <PhotoCredit credit={story.imageCredit} links={false} />
      </div>
      <p className={`${kicker} mt-5 text-rust-deep`}>{categoryLabel(story.category)}</p>
      <p className={`mt-2 text-stone transition-colors group-hover:text-rust-deep ${size === "large" ? headline.card : headline.small}`}>{story.title}</p>
      <p className={`${blurb} mt-3 line-clamp-3 text-stone/80`}>{story.excerpt}</p>
      <p className={`${meta} mt-4 text-stone/80`}>{story.readingTime}</p>
    </Link>
  );
}
