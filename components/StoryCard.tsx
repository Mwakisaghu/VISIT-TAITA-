import Link from "next/link";
import Image from "next/image";
import type { Story } from "@prisma/client";
import { categoryLabel } from "@/lib/format";
import { canOptimize } from "@/lib/image-src";
import PhotoCredit from "@/components/PhotoCredit";
import { storyPicture } from "@/lib/story-picture";

export default function StoryCard({ story, size = "regular" }: { story: Story; size?: "regular" | "large" }) {
  const src = storyPicture(story.image);
  return (
    <Link href={`/stories/${story.slug}`} className="focus-ring group block">
      <div
        className={`relative overflow-hidden rounded-sm bg-stone/10 ${
          size === "large" ? "aspect-[16/10]" : "aspect-[4/3]"
        }`}
      >
        <Image
          src={src}
          alt={story.title}
          fill
          unoptimized={!canOptimize(src)}
          sizes={size === "large" ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 640px) 33vw, 100vw"}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <PhotoCredit credit={story.imageCredit} links={false} />
      </div>
      <p className="mt-4 font-body text-xs text-rust">{categoryLabel(story.category)}</p>
      <p className={`font-display text-stone ${size === "large" ? "text-3xl" : "text-xl"}`}>
        {story.title}
      </p>
      <p className="mt-2 font-body text-sm text-stone/80">{story.excerpt}</p>
      <p className="mt-2 font-body text-xs text-stone/80">{story.readingTime}</p>
    </Link>
  );
}
