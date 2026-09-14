import Link from "next/link";
import Image from "next/image";
import type { Destination } from "@prisma/client";
import { categoryToSlug } from "@/lib/format";

export default function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <Link
      href={`/discover/${categoryToSlug(destination.category)}#${destination.slug}`}
      className="focus-ring group block"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-stone/10">
        <Image
          src={destination.image}
          alt={destination.name}
          fill
          unoptimized
          sizes="(min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <p className="mt-3 font-body text-xs text-stone/60">{destination.region}</p>
      <p className="font-display text-xl text-stone">{destination.name}</p>
    </Link>
  );
}
