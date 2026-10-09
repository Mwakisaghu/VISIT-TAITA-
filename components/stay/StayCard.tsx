import Link from "next/link";
import type { Accommodation } from "@prisma/client";
import Photo from "@/components/home/Photo";
import Tag from "@/components/field/Tag";
import PersonChip from "@/components/field/PersonChip";
import { MOODS, altitudeLabel } from "@/lib/field-guide";
import { accommodationTypeLabel, formatPrice } from "@/lib/format";

type Rating = { average: number; count: number } | null;

/** A stay with its host: what kind, how high, how it feels, who looks after you, and what it costs. */
export default function StayCard({ stay: a, rating }: { stay: Accommodation; rating: Rating }) {
  const moods = (a.moods ?? []).flatMap((k) => { const m = MOODS.find((x) => x.key === k); return m ? [m.label as string] : []; }).slice(0, 2);
  const hasRating = !!rating && rating.count > 0;
  return (
    <Link href={`/stay/listing/${a.slug}`} className="focus-ring group flex flex-col overflow-hidden rounded-[2px] border border-stone/15 bg-parchment text-stone transition-shadow hover:shadow-lg motion-reduce:transition-none">
      <div className="relative aspect-[4/3] bg-canopy-deep">
        <Photo src={a.image} alt="" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone="fill">{accommodationTypeLabel(a.type)}</Tag>
          {a.altitudeM != null && <Tag>{altitudeLabel(a.altitudeM)}</Tag>}
        </div>
        <h2 className="mt-4 font-display text-2xl font-medium leading-tight tracking-tight">{a.name}</h2>
        <p className="mt-1 font-body text-sm text-stone/75">{a.region}</p>
        {a.hostName && <div className="mt-4"><PersonChip size="sm" name={a.hostName} role={a.hostRole} verb="Hosted by" /></div>}
        {moods.length > 0 && <p className="mt-3 font-body text-xs font-semibold text-stone/75">{moods.join(" · ")}</p>}
        <div className="mt-auto flex items-end justify-between gap-3 pt-5 font-body">
          {a.priceFrom ? (
            <span><span className="block text-[1.05rem] font-bold leading-tight">From {formatPrice(a.priceFrom)}</span><span className="block text-xs text-stone/75">a night</span></span>
          ) : (
            <span className="text-[0.95rem] font-bold">Contact for rates</span>
          )}
          {hasRating && (
            <span className="text-xs text-stone/80" aria-label={`Rated ${rating!.average.toFixed(1)} out of 5 from ${rating!.count} review${rating!.count === 1 ? "" : "s"}`}>
              <span aria-hidden="true" className="text-ochre">★</span> {rating!.average.toFixed(1)} ({rating!.count})
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
