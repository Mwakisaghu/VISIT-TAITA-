import Link from "next/link";
import AltitudeRibbon from "@/components/field/AltitudeRibbon";
import Tag from "@/components/field/Tag";
import { action, headline, kicker, meta } from "@/components/stories/type";
import { altitudeLabel } from "@/lib/field-guide";
import { placeHref } from "@/lib/stories-view";

type Place = { name: string; region: string; category: string; altitudeM: number | null };

/** "Where this happened": the place a story is about, with where it sits between the plains and the hills. */
export default function WherePanel({ place }: { place: Place }) {
  const href = placeHref(place.category);
  return (
    <section aria-labelledby="where-title" className="rounded-[2px] border border-stone/15 p-6">
      <p id="where-title" className={`${kicker} text-rust-deep`}>Where this happened</p>
      <h2 className={`mt-3 text-stone ${headline.small}`}>{place.name}</h2>
      <p className={`${meta} mt-1 text-stone/80`}>{place.region}</p>
      {place.altitudeM != null && (
        <>
          <div className="mt-4"><Tag>{altitudeLabel(place.altitudeM)}</Tag></div>
          <div className="mt-3"><AltitudeRibbon altitudeM={place.altitudeM} /></div>
        </>
      )}
      {href && <Link href={href} className={`${action} mt-3 text-stone hover:text-rust-deep`}>More places like this<span aria-hidden="true">&nbsp;→</span></Link>}
    </section>
  );
}
