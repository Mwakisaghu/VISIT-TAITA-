import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";
import PlaceCard from "@/components/discover/PlaceCard";
import { discoverCategories } from "@/lib/data";
import { ZONES, zoneRange, type Zone } from "@/lib/field-guide";
import { prisma } from "@/lib/prisma";

// Each chapter has its own look, so the page changes pace as you scroll.
const THEMES = [
  { section: "bg-canopy-deep text-parchment", sub: "text-parchment/85", num: "text-ochre-light", link: "border-parchment/70 text-parchment" },
  { section: "bg-[#DCD0B2] text-stone", sub: "text-stone/85", num: "text-rust-deep", link: "border-stone text-stone" },
  { section: "bg-stone text-parchment", sub: "text-parchment/85", num: "text-ochre-light", link: "border-parchment/70 text-parchment" },
  { section: "bg-parchment text-stone", sub: "text-stone/85", num: "text-rust-deep", link: "border-stone text-stone" },
  { section: "bg-canopy text-parchment", sub: "text-parchment/90", num: "text-ochre-light", link: "border-parchment/70 text-parchment" },
  { section: "bg-[#DCD0B2] text-stone", sub: "text-stone/85", num: "text-rust-deep", link: "border-stone text-stone" },
];

export async function DiscoverChapters({ zone }: { zone: Zone | null }) {
  const places = await prisma.destination.findMany({
    where: { status: "PUBLISHED", ...(zone ? { altitudeM: zoneRange(zone) } : {}) },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });
  const hasDemo = places.some((p) => p.isDemo);
  const chapters = discoverCategories.map((cat, i) => ({ cat, n: i + 1, items: places.filter((p) => p.category.toLowerCase() === cat.key), theme: THEMES[i % THEMES.length] })).filter((c) => c.items.length > 0);

  return (
    <>
      {chapters.length > 0 ? chapters.map(({ cat, n, items, theme }) => (
        <section key={cat.key} aria-labelledby={`world-${cat.key}`} className={`px-6 py-16 sm:py-20 ${theme.section}`}>
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[18rem_1fr] lg:gap-14">
            <div>
              <p className={`font-display text-[3rem] font-medium leading-[0.85] sm:text-[4.2rem] ${theme.num}`} aria-hidden="true">{String(n).padStart(2, "0")}</p>
              <h2 id={`world-${cat.key}`} className="mt-3 font-display text-[clamp(1.92rem,4vw,2.8rem)] font-medium leading-none tracking-tight">{cat.label}</h2>
              <p className={`mt-4 max-w-xs font-body text-base ${theme.sub}`}>{cat.description}</p>
              <Link href={`/discover/${cat.key}${zone ? `?zone=${zone.toLowerCase()}` : ""}`} className={`focus-ring mt-6 inline-flex min-h-[44px] items-center rounded-[2px] border px-5 font-body text-[0.72rem] font-bold uppercase tracking-[0.18em] ${theme.link}`}>All {items.length} {items.length === 1 ? "place" : "places"}<span className="sr-only"> in {cat.label}</span></Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.slice(0, 3).map((p, idx) => <PlaceCard key={p.slug} place={p} priority={n === 1 && idx === 0} />)}
            </div>
          </div>
        </section>
      )) : (
        <section className="px-6 py-16"><div className="mx-auto max-w-6xl rounded-[2px] border border-stone/20 p-8"><p className="font-display text-2xl text-stone">{zone ? "No places at that height yet." : "No places published yet."}</p>{zone && <Link href="/discover" className="focus-ring mt-4 inline-block font-body text-sm font-semibold text-rust-deep underline underline-offset-4">Show every height</Link>}</div></section>
      )}

      {hasDemo && <div className="mx-auto max-w-6xl px-6 py-10"><DemoNotice>some positions and altitudes are estimates pending on-the-ground verification.</DemoNotice></div>}
    </>
  );
}
