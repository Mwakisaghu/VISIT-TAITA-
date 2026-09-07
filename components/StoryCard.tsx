import Link from "next/link";
import type { Story } from "@/lib/data";

export default function StoryCard({ story, size = "regular" }: { story: Story; size?: "regular" | "large" }) {
  return (
    <Link href={`/stories/${story.slug}`} className="focus-ring group block">
      <div
        className={`relative overflow-hidden rounded-sm bg-stone/10 ${
          size === "large" ? "aspect-[16/10]" : "aspect-[4/3]"
        }`}
      >
        <img
          src={story.image}
          alt={story.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <p className="mt-4 font-body text-xs text-rust">{story.category}</p>
      <p className={`font-display text-stone ${size === "large" ? "text-3xl" : "text-xl"}`}>
        {story.title}
      </p>
      <p className="mt-2 font-body text-sm text-stone/70">{story.excerpt}</p>
      <p className="mt-2 font-body text-xs text-stone/50">{story.readingTime}</p>
    </Link>
  );
}
