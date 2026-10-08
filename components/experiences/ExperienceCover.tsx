import Link from "next/link";
import type { Experience } from "@prisma/client";
import Photo from "@/components/home/Photo";
import Tag from "@/components/field/Tag";
import PersonChip from "@/components/field/PersonChip";
import DateChips from "@/components/field/DateChips";
import { altitudeLabel, climbLabel, LEVEL_LABEL, nextChips, type SessionLite } from "@/lib/field-guide";
import { experienceCategoryLabel, formatPrice } from "@/lib/format";

type Rating = { average: number; count: number } | null;

/** An experience as a magazine cover: how long, how hard, how high, who leads it, and when it next runs — before you open it. */
export default function ExperienceCover({ experience: x, sessions, rating, now }: { experience: Experience; sessions: SessionLite[]; rating: Rating; now: Date }) {
  const chips = nextChips(sessions, now);
  const hasRating = !!rating && rating.count > 0;
  return (
    <Link href={`/experiences/listing/${x.slug}`} className="focus-ring group relative flex min-h-[32rem] flex-col justify-end overflow-hidden rounded-[2px] bg-canopy-deep text-parchment sm:min-h-[36rem]">
      <Photo src={x.image} alt="" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-stone/95 via-stone/60 to-stone/5" />
      <div className="relative p-6">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone="gold">{experienceCategoryLabel(x.category)}</Tag>
          {x.duration && <Tag tone="light">{x.duration}</Tag>}
          {x.difficulty && <Tag tone="light">{LEVEL_LABEL[x.difficulty]}</Tag>}
          {x.elevationGainM != null && <Tag tone="light">{climbLabel(x.elevationGainM)}</Tag>}
          {x.altitudeM != null && <Tag tone="light">{altitudeLabel(x.altitudeM)}</Tag>}
        </div>
        <h2 className="mt-4 font-display text-[1.9rem] font-medium leading-[1.1] tracking-tight">{x.name}</h2>
        <p className="mt-1 font-body text-sm text-parchment/85">{x.region}</p>
        {x.hostName && <div className="mt-4"><PersonChip tone="light" name={x.hostName} role={x.hostRole} verb="Led by" /></div>}
        {hasRating && (
          <p className="mt-3 font-body text-xs text-parchment/90" aria-label={`Rated ${rating!.average.toFixed(1)} out of 5 from ${rating!.count} review${rating!.count === 1 ? "" : "s"}`}>
            <span aria-hidden="true" className="text-ochre-light">★</span> {rating!.average.toFixed(1)} ({rating!.count})
          </p>
        )}
        <p className="mt-5 font-body text-[0.65rem] font-bold uppercase tracking-[0.22em] text-parchment/85">Next dates</p>
        <div className="mt-2">
          {chips.length > 0 ? <DateChips chips={chips} /> : <p className="font-body text-sm text-parchment/85">{x.bookingEnabled ? "No dates open right now" : "Dates on request"}</p>}
        </div>
        <div className="mt-5 flex items-end justify-between gap-3 font-body">
          {x.priceFrom ? (
            <span><span className="block text-[1.05rem] font-bold leading-tight">From {formatPrice(x.priceFrom)}</span><span className="block text-xs text-parchment/85">per person</span></span>
          ) : (
            <span className="text-[0.95rem] font-bold">Contact for pricing</span>
          )}
          <span className="whitespace-nowrap text-[0.7rem] font-bold uppercase tracking-[0.2em] text-ochre-light">{x.bookingEnabled ? "Book a date" : "See details"} <span aria-hidden="true">→</span></span>
        </div>
      </div>
    </Link>
  );
}
