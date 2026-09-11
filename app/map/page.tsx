import type { Metadata } from "next";
import SectionHeading from "@/components/SectionHeading";
import DemoNotice from "@/components/DemoNotice";
import MapLoader from "@/components/map/MapLoader";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Map",
  description: "An interactive map of Taita Taveta — wildlife, culture, adventure, food, sport and people.",
};

export default async function MapPage() {
  const destinations = await prisma.destination.findMany({
    where: {
      status: "PUBLISHED",
      latitude: { not: null },
      longitude: { not: null },
    },
    orderBy: { name: "asc" },
  });

  const mapped = destinations
    .filter((d) => d.latitude !== null && d.longitude !== null)
    .map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      category: d.category,
      region: d.region,
      blurb: d.blurb,
      image: d.image,
      latitude: d.latitude as number,
      longitude: d.longitude as number,
    }));

  const hasDemo = destinations.some((d) => d.isDemo);

  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          title="Map"
          description="Every mapped place in Taita, filterable by world. Tap a pin for details."
        />

        <div className="mt-10">
          <MapLoader destinations={mapped} />
        </div>

        {hasDemo && (
          <div className="mt-6">
            <DemoNotice>pin locations are approximate pending on-the-ground verification.</DemoNotice>
          </div>
        )}
      </div>
    </div>
  );
}
