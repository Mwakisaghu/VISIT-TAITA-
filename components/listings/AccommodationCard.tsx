import Link from "next/link";
import Image from "next/image";
import type { Accommodation } from "@prisma/client";
import { accommodationTypeLabel, formatPrice } from "@/lib/format";

export default function AccommodationCard({ accommodation }: { accommodation: Accommodation }) {
  return (
    <Link href={`/stay/listing/${accommodation.slug}`} className="focus-ring group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-stone/10">
        <Image
          src={accommodation.image}
          alt={accommodation.name}
          fill
          unoptimized
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-stone/80 px-3 py-1 font-body text-xs text-parchment backdrop-blur">
          {accommodationTypeLabel(accommodation.type)}
        </span>
      </div>
      <p className="mt-3 font-body text-xs text-stone/60">{accommodation.region}</p>
      <p className="font-display text-lg text-stone">{accommodation.name}</p>
      <p className="mt-1 font-body text-sm text-stone/70">
        {accommodation.priceFrom ? `From ${formatPrice(accommodation.priceFrom)}/night` : "Contact for rates"}
      </p>
    </Link>
  );
}
