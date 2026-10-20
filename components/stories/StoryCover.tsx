import Link from "next/link";
import type { Story } from "@prisma/client";
import Photo from "@/components/home/Photo";
import PhotoCredit from "@/components/PhotoCredit";
import { blurb, headline, kicker, meta } from "@/components/stories/type";
import { categoryLabel } from "@/lib/format";
import { storyShape, type Shape } from "@/lib/stories-view";
import { storyPicture } from "@/lib/story-picture";

const HEIGHT: Record<Shape, string> = { tall: "min-h-[34rem]", wide: "min-h-[22rem]", standard: "min-h-[27rem]" };

/** A story as a cover: a label, the headline, a description, then the small facts, always in that order. People are told in tall portrait covers, places and adventures in wide ones. */
export default function StoryCover({ story: s, large = false }: { story: Story & { destination?: { name: string } | null }; large?: boolean }) {
  const shape = storyShape(s.category);
  return (
    <Link href={`/stories/${s.slug}`} className={`focus-ring group relative flex flex-col justify-end overflow-hidden rounded-[2px] bg-canopy-deep text-parchment ${large ? "min-h-[30rem] sm:min-h-[34rem]" : HEIGHT[shape]}`}>
      <Photo src={storyPicture(s.image)} alt="" priority={large} sizes={large ? "(min-width: 1152px) 1152px, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"} className="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-stone/95 via-stone/55 to-stone/5" />
      <PhotoCredit credit={s.imageCredit} position="top-right" links={false} />
      <div className="relative p-6 sm:p-8">
        <p className={`${kicker} text-ochre-light`}>{categoryLabel(s.category)}</p>
        <h2 className={`mt-3 ${large ? `max-w-3xl ${headline.feature}` : headline.card}`}>{s.title}</h2>
        {(large || shape !== "tall") && <p className={`${blurb} mt-3 text-parchment/90 ${large ? "max-w-xl" : "line-clamp-2"}`}>{s.excerpt}</p>}
        <p className={`${meta} mt-4 text-parchment/85`}>{s.readingTime}{s.destination ? ` · ${s.destination.name}` : ""}</p>
      </div>
    </Link>
  );
}
