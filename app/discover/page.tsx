import type { Metadata } from "next";
import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";
import { discoverCategories } from "@/lib/data";
import { slugToCategory } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Discover Taita",
  description:
    "Wild, culture, adventure, food, sport and people — six ways into Taita Taveta, Kenya.",
};

export const revalidate = 60;

export default async function DiscoverIndexPage() {
  const counts = await prisma.destination.groupBy({
    by: ["category"],
    where: { status: "PUBLISHED" },
    _count: true,
  });
  const countByCategory = new Map(counts.map((c) => [c.category, c._count]));

  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            title="Discover Taita"
            description="Every place here belongs to one of six worlds. Pick a way in."
          />
          <Link
            href="/map"
            className="focus-ring rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone transition-colors hover:border-rust hover:text-rust"
          >
            View on map
          </Link>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {discoverCategories.map((cat) => {
            const count = countByCategory.get(slugToCategory(cat.key) as any) ?? 0;
            return (
              <Link
                key={cat.key}
                href={`/discover/${cat.key}`}
                className="focus-ring group flex flex-col justify-between rounded-sm bg-stone p-6 transition-colors hover:bg-canopy"
              >
                <div>
                  <p className="font-display text-2xl text-parchment">{cat.label}</p>
                  <p className="mt-2 font-body text-sm text-parchment/70">{cat.description}</p>
                </div>
                <p className="mt-8 font-body text-xs text-parchment/50">
                  {count} {count === 1 ? "place" : "places"}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
