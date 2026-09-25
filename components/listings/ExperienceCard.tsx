import Link from "next/link";
import Image from "next/image";
import type { Experience } from "@prisma/client";
import { experienceCategoryLabel, formatPrice } from "@/lib/format";

export default function ExperienceCard({ experience }: { experience: Experience }) {
  return (
    <Link href={`/experiences/listing/${experience.slug}`} className="focus-ring group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-stone/10">
        <Image
          src={experience.image}
          alt={experience.name}
          fill
          unoptimized
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-stone/80 px-3 py-1 font-body text-xs text-parchment backdrop-blur">
          {experienceCategoryLabel(experience.category)}
        </span>
      </div>
      <p className="mt-3 font-body text-xs text-stone/60">
        {experience.region}
        {experience.duration ? ` · ${experience.duration}` : ""}
      </p>
      <p className="font-display text-lg text-stone">{experience.name}</p>
      <p className="mt-1 font-body text-sm text-stone/70">
        {experience.priceFrom ? `From ${formatPrice(experience.priceFrom)}/person` : "Contact for pricing"}
      </p>
    </Link>
  );
}
