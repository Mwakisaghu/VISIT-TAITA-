import Link from "next/link";
import Photo from "@/components/home/Photo";
import Tag from "@/components/field/Tag";
import { LEVEL_LABEL, nextChips, type SessionLite } from "@/lib/field-guide";
import { formatPrice } from "@/lib/format";

type Row = { slug: string; name: string; image: string; duration: string | null; difficulty: "EASY" | "MODERATE" | "HARD" | null; priceFrom: number | null; sessions: SessionLite[] };

/** "Also in this area": experiences in the same region as the stay, each with its next dates. Shows nothing when there are none. */
export default function NearbyExperiences({ items, region, now }: { items: Row[]; region: string; now: Date }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="nearby-title" className="mt-12">
      <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-rust-deep">Do this nearby</p>
      <h2 id="nearby-title" className="mt-2 font-display text-2xl text-stone">Also in {region}</h2>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((x) => {
          const chips = nextChips(x.sessions, now, 2);
          return (
            <li key={x.slug}>
              <Link href={`/experiences/listing/${x.slug}`} className="focus-ring group flex h-full flex-col overflow-hidden rounded-[2px] border border-stone/15 text-stone">
                <div className="relative aspect-[16/10] bg-canopy-deep"><Photo src={x.image} alt="" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw" className="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" /></div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex flex-wrap gap-1.5">{x.duration && <Tag>{x.duration}</Tag>}{x.difficulty && <Tag>{LEVEL_LABEL[x.difficulty]}</Tag>}</div>
                  <h3 className="mt-3 font-display text-lg leading-snug">{x.name}</h3>
                  <p className="mt-2 font-body text-xs font-semibold text-stone/80">{chips.length > 0 ? `Next: ${chips.map((c) => c.label).join(" · ")}` : "Dates on request"}</p>
                  <p className="mt-auto pt-3 font-body text-sm font-bold">{x.priceFrom ? `From ${formatPrice(x.priceFrom)}` : "Contact for pricing"}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
