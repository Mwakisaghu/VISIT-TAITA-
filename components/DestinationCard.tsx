import Link from "next/link";
import type { Destination } from "@prisma/client";
import { categoryToSlug } from "@/lib/format";

export default function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <Link
      href={`/discover/${categoryToSlug(destination.category)}#${destination.slug}`}
      className="focus-ring group block"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-stone/10">
        <img
          src={destination.image}
          alt={destination.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <p className="mt-3 font-body text-xs text-stone/60">{destination.region}</p>
      <p className="font-display text-xl text-stone">{destination.name}</p>
    </Link>
  );
}
