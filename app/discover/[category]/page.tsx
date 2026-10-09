import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DemoNotice from "@/components/DemoNotice";
import PlaceCard from "@/components/discover/PlaceCard";
import ZoneLinks from "@/components/discover/ZoneLinks";
import { discoverCategories } from "@/lib/data";
import { ZONES, zoneRange, type Zone } from "@/lib/field-guide";
import { slugToCategory } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ category: string }> | { category: string }; searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> };

export function generateStaticParams() {
  return discoverCategories.map((c) => ({ category: c.key }));
}

// `params` and `searchParams` are read with `await` so this page is correct on today's Next.js and on the next one (where they become promises).
export async function generateMetadata({ params }: Pick<Ctx, "params">): Promise<Metadata> {
  const { category } = await params;
  const cat = discoverCategories.find((c) => c.key === category);
  if (!cat) return {};
  return { title: `${cat.label} in Taita`, description: cat.description };
}

export default async function DiscoverCategoryPage({ params, searchParams }: Ctx) {
  const { category } = await params;
  const cat = discoverCategories.find((c) => c.key === category);
  if (!cat) notFound();
  const sp = (await searchParams) ?? {};
  const z = (Array.isArray(sp.zone) ? sp.zone[0] : sp.zone ?? "").toUpperCase();
  const zone = (ZONES as string[]).includes(z) ? (z as Zone) : null;

  const items = await prisma.destination.findMany({
    where: { category: slugToCategory(category) as any, status: "PUBLISHED", ...(zone ? { altitudeM: zoneRange(zone) } : {}) },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });
  const hasDemo = items.some((d) => d.isDemo);
  const base = `/discover/${cat.key}`;

  return (
    <div>
      <section className="bg-parchment px-6 pb-8 pt-16 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <Link href="/discover" className="focus-ring font-body text-sm text-stone/70 hover:text-rust-deep">← All worlds</Link>
          <p className="mt-6 font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-rust-deep">Discover</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="font-display text-[clamp(2.8rem,7vw,5rem)] font-medium leading-[1.02] tracking-tight text-stone">{cat.label}</h1>
            <p className="max-w-xs font-body text-base text-stone/80">{cat.description}</p>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4"><ZoneLinks base={base} current={zone} /><Link href={`/map?world=${cat.key}${zone ? `&zone=${zone.toLowerCase()}` : ""}`} className="focus-ring inline-flex min-h-[44px] items-center font-body text-sm font-semibold text-rust-deep underline underline-offset-4">See these on the map<span aria-hidden="true">&nbsp;→</span></Link></div>
        </div>
      </section>
      <section className="px-6 pb-20 pt-6">
        <div className="mx-auto max-w-6xl">
          {items.length > 0 ? (
            <>
              <p role="status" className="font-body text-sm text-stone/70">{items.length} {items.length === 1 ? "place" : "places"}</p>
              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {items.map((d) => <div id={d.slug} key={d.slug}><PlaceCard place={d} /></div>)}
              </div>
            </>
          ) : (
            <div className="rounded-[2px] border border-stone/20 p-8">
              <p className="font-display text-2xl text-stone">{zone ? "No places at that height yet." : "Places in this world are being verified before publishing. Check back soon."}</p>
              {zone && <Link href={base} className="focus-ring mt-4 inline-block font-body text-sm font-semibold text-rust-deep underline underline-offset-4">Show every height</Link>}
            </div>
          )}
          {hasDemo && <div className="mt-10"><DemoNotice>some positions and altitudes are estimates pending on-the-ground verification.</DemoNotice></div>}
        </div>
      </section>
    </div>
  );
}
