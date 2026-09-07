import type { Metadata } from "next";
import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";
import { destinations, discoverCategories } from "@/lib/data";

export const metadata: Metadata = {
  title: "Discover Taita",
  description:
    "Wild, culture, adventure, food, sport and people — six ways into Taita Taveta, Kenya.",
};

export default function DiscoverIndexPage() {
  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          title="Discover Taita"
          description="Every place here belongs to one of six worlds. Pick a way in."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {discoverCategories.map((cat) => {
            const count = destinations.filter((d) => d.category === cat.key).length;
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
