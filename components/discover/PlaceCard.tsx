import Link from "next/link";
import type { Destination } from "@prisma/client";
import Photo from "@/components/home/Photo";
import Tag from "@/components/field/Tag";
import { altitudeLabel } from "@/lib/field-guide";

/** A place as a card: where it is, how high it sits, and a way to see it on the map. */
export default function PlaceCard({ place: d, priority = false }: { place: Destination; priority?: boolean }) {
  return (
    <Link href={`/map?place=${d.slug}`} className="focus-ring group relative flex min-h-[24rem] flex-col justify-end overflow-hidden rounded-[2px] bg-canopy-deep text-parchment">
      <Photo src={d.image} alt="" priority={priority} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-stone/95 via-stone/55 to-stone/5" />
      <span className="relative p-6">
        <span className="flex flex-wrap gap-1.5">
          {d.altitudeM != null && <Tag tone="gold">{altitudeLabel(d.altitudeM)}</Tag>}
          {d.latitude != null && <Tag tone="light">On the map</Tag>}
        </span>
        <span className="mt-4 block font-display text-[1.7rem] font-medium leading-[1.1] tracking-tight">{d.name}</span>
        <span className="mt-1 block font-body text-sm text-parchment/85">{d.region}</span>
        <span className="mt-3 line-clamp-2 block font-body text-sm text-parchment/90">{d.blurb}</span>
        <span className="mt-4 inline-block font-body text-[0.7rem] font-bold uppercase tracking-[0.2em] text-ochre-light">Show on the map <span aria-hidden="true">→</span></span>
      </span>
    </Link>
  );
}
