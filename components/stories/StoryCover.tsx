import Link from "next/link";
import type { Story } from "@prisma/client";
import Photo from "@/components/home/Photo";
import Tag from "@/components/field/Tag";
import { categoryLabel } from "@/lib/format";
import { storyShape, type Shape } from "@/lib/stories-view";

const HEIGHT: Record<Shape, string> = { tall: "min-h-[34rem]", wide: "min-h-[22rem]", standard: "min-h-[27rem]" };

/** A story as a cover. People are told in tall portrait covers, places and adventures in wide ones. */
export default function StoryCover({ story: s, large = false }: { story: Story & { destination?: { name: string } | null }; large?: boolean }) {
  const shape = storyShape(s.category);
  return (
    <Link href={`/stories/${s.slug}`} className={`focus-ring group relative flex flex-col justify-end overflow-hidden rounded-[2px] bg-canopy-deep text-parchment ${large ? "min-h-[30rem] sm:min-h-[34rem]" : HEIGHT[shape]}`}>
      <Photo src={s.image} alt="" priority={large} sizes={large ? "(min-width: 1152px) 1152px, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"} className="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-stone/95 via-stone/55 to-stone/5" />
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone="gold">{categoryLabel(s.category)}</Tag>
          <Tag tone="light">{s.readingTime}</Tag>
          {s.destination && <Tag tone="light">{s.destination.name}</Tag>}
        </div>
        <h2 className={`mt-4 font-display font-medium leading-[1.1] tracking-tight ${large ? "max-w-3xl text-[clamp(2rem,5vw,3.5rem)]" : "text-[1.75rem]"}`}>{s.title}</h2>
        {(large || shape !== "tall") && <p className={`mt-3 font-body text-parchment/90 ${large ? "max-w-xl text-base" : "line-clamp-2 text-sm"}`}>{s.excerpt}</p>}
      </div>
    </Link>
  );
}
