import type { Metadata } from "next";
import DemoNotice from "@/components/DemoNotice";
import MapLoader from "@/components/map/MapLoader";
import { buildItems } from "@/lib/explore";
import { optimizedUrl } from "@/lib/image-src";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Explore the map",
  description: "Every mapped place, stay and experience in Taita Taveta, Kenya, with how high each one sits between the plains and the hills.",
};

export const revalidate = 120;

const has = { latitude: { not: null }, longitude: { not: null } } as const;

export default async function MapPage() {
  const [places, stays, experiences] = await Promise.all([
    prisma.destination.findMany({ where: { status: "PUBLISHED", ...has }, orderBy: { name: "asc" }, select: { id: true, slug: true, name: true, region: true, image: true, latitude: true, longitude: true, altitudeM: true, category: true, blurb: true, isDemo: true } }),
    prisma.accommodation.findMany({ where: { status: "PUBLISHED", ...has }, orderBy: { name: "asc" }, select: { id: true, slug: true, name: true, region: true, image: true, latitude: true, longitude: true, altitudeM: true, type: true, description: true, hostName: true, isDemo: true } }),
    prisma.experience.findMany({ where: { status: "PUBLISHED", ...has }, orderBy: { name: "asc" }, select: { id: true, slug: true, name: true, region: true, image: true, latitude: true, longitude: true, altitudeM: true, category: true, description: true, hostName: true, isDemo: true } }),
  ]);
  // The list shows a thumbnail 80 px wide: send a small copy, not the full-size file.
  const items = buildItems(places, stays, experiences).map((i) => ({ ...i, image: optimizedUrl(i.image, 384) }));
  const hasDemo = [...places, ...stays, ...experiences].some((x) => x.isDemo);

  return (
    <div>
      <section className="bg-parchment px-6 pb-8 pt-16 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-rust-deep">Explore</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="max-w-3xl font-display text-[clamp(2.6rem,6vw,4.5rem)] font-medium leading-[1.04] tracking-tight text-stone">From the plains to the peaks.</h1>
            <p className="max-w-xs font-body text-base text-stone/80">Every mapped place, stay and experience, with how high each one sits. Pick one to see it up close.</p>
          </div>
        </div>
      </section>
      <section className="px-6 pb-20 pt-4">
        <div className="mx-auto max-w-6xl">
          <MapLoader items={items} />
          {hasDemo && <div className="mt-6"><DemoNotice>some pin positions and altitudes are estimates pending on-the-ground verification.</DemoNotice></div>}
        </div>
      </section>
    </div>
  );
}
