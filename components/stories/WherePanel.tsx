import Link from "next/link";
import AltitudeRibbon from "@/components/field/AltitudeRibbon";
import Tag from "@/components/field/Tag";
import { altitudeLabel } from "@/lib/field-guide";
import { placeHref } from "@/lib/stories-view";

type Place = { name: string; region: string; category: string; altitudeM: number | null };

/** "Where this happened": the place a story is about, with where it sits between the plains and the hills. */
export default function WherePanel({ place }: { place: Place }) {
  const href = placeHref(place.category);
  return (
    <section aria-labelledby="where-title" className="rounded-[2px] border border-stone/15 p-6">
      <p id="where-title" className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-rust-deep">Where this happened</p>
      <h2 className="mt-3 font-display text-2xl leading-tight text-stone">{place.name}</h2>
      <p className="mt-1 font-body text-sm text-stone/80">{place.region}</p>
      {place.altitudeM != null && (
        <>
          <div className="mt-4"><Tag>{altitudeLabel(place.altitudeM)}</Tag></div>
          <div className="mt-3"><AltitudeRibbon altitudeM={place.altitudeM} /></div>
        </>
      )}
      {href && <Link href={href} className="focus-ring mt-4 inline-flex min-h-[44px] items-center font-body text-sm font-semibold text-stone underline underline-offset-4">More places like this<span aria-hidden="true">&nbsp;→</span></Link>}
    </section>
  );
}
