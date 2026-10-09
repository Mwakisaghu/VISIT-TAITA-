import Link from "next/link";
import Photo from "@/components/home/Photo";
import { nextChips, type SessionLite } from "@/lib/field-guide";
import { formatPrice } from "@/lib/format";
import { placeHref } from "@/lib/stories-view";

type Place = { name: string; category: string; image: string } | null;
type Stay = { slug: string; name: string; image: string; priceFrom: number | null } | null;
type Exp = { slug: string; name: string; image: string; sessions: SessionLite[] } | null;

/** The way on from a story: go there, stay near, do this. Only the tiles that exist are shown; with none, nothing is. */
export default function GoThereRow({ place, stay, experience, now }: { place: Place; stay: Stay; experience: Exp; now: Date }) {
  const tiles: { key: string; label: string; name: string; note: string | null; image: string; href: string }[] = [];
  const placeLink = place ? placeHref(place.category) : null;
  if (place && placeLink) tiles.push({ key: "go", label: "Go there", name: place.name, note: null, image: place.image, href: placeLink });
  if (stay) tiles.push({ key: "stay", label: "Stay near", name: stay.name, note: stay.priceFrom ? `From ${formatPrice(stay.priceFrom)} a night` : null, image: stay.image, href: `/stay/listing/${stay.slug}` });
  if (experience) { const c = nextChips(experience.sessions, now, 1)[0]; tiles.push({ key: "do", label: "Do this", name: experience.name, note: c ? `Next: ${c.label}` : "Dates on request", image: experience.image, href: `/experiences/listing/${experience.slug}` }); }
  if (tiles.length === 0) return null;
  return (
    <section aria-labelledby="keepgoing-title" className="mt-16">
      <p id="keepgoing-title" className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-rust-deep">Keep going</p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.key}>
            <Link href={t.href} className="focus-ring group relative flex min-h-[13rem] flex-col justify-end overflow-hidden rounded-[2px] bg-canopy-deep text-parchment">
              <Photo src={t.image} alt="" sizes="(min-width: 640px) 33vw, 100vw" className="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-stone/95 via-stone/55 to-stone/5" />
              <span className="relative p-5">
                <span className="block font-body text-[0.65rem] font-bold uppercase tracking-[0.22em] text-ochre-light">{t.label}</span>
                <span className="mt-1 block font-display text-xl leading-snug">{t.name}</span>
                {t.note && <span className="mt-1 block font-body text-xs text-parchment/90">{t.note}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
