import Link from "next/link";
import type { Accommodation } from "@prisma/client";
import Photo from "@/components/home/Photo";
import Tag from "@/components/field/Tag";
import PersonChip from "@/components/field/PersonChip";
import { primaryCta } from "@/components/home/ui";
import { altitudeLabel } from "@/lib/field-guide";
import { accommodationTypeLabel, formatPrice } from "@/lib/format";

/** The one stay the team features, shown large with its host's own words. */
export default function StayFeature({ stay: a }: { stay: Accommodation }) {
  return (
    <article className="grid overflow-hidden rounded-[2px] border border-stone/15 bg-parchment lg:grid-cols-[1.25fr_1fr]">
      <div className="relative min-h-[22rem] bg-canopy-deep lg:min-h-[32rem]">
        <Photo src={a.image} alt="" priority sizes="(min-width: 1024px) 60vw, 100vw" />
      </div>
      <div className="flex flex-col justify-center p-8 sm:p-11">
        <div className="flex flex-wrap gap-2">
          <Tag tone="fill">{accommodationTypeLabel(a.type)}</Tag>
          {a.altitudeM != null && <Tag>{altitudeLabel(a.altitudeM)}</Tag>}
        </div>
        <h2 className="mt-5 font-display text-4xl font-medium leading-[1.06] tracking-tight text-stone">{a.name}</h2>
        <p className="mt-1 font-body text-sm text-stone/75">{a.region}</p>
        {a.hostName && (
          <div className="mt-6">
            <PersonChip name={a.hostName} role={a.hostRole} verb="Hosted by" />
            {a.hostQuote && <p className="mt-3 max-w-prose font-display text-lg leading-snug text-stone/90">&ldquo;{a.hostQuote}&rdquo;</p>}
          </div>
        )}
        <p className="mt-6 line-clamp-3 max-w-prose font-body text-[0.95rem] text-stone/80">{a.description}</p>
        <div className="mt-7 flex flex-wrap items-center gap-5">
          <Link href={`/stay/listing/${a.slug}`} className={primaryCta}>See this stay <span aria-hidden="true">→</span></Link>
          <span className="font-body text-sm font-bold text-stone">{a.priceFrom ? `From ${formatPrice(a.priceFrom)} a night` : "Contact for rates"}</span>
        </div>
      </div>
    </article>
  );
}
