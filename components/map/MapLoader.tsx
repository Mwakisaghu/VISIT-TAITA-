"use client";

import dynamic from "next/dynamic";
import type { Item } from "@/lib/explore";

const ExploreMap = dynamic(() => import("@/components/map/ExploreMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[28rem] items-center justify-center rounded-[2px] border border-stone/20 bg-stone/5 lg:h-[46rem]">
      <p className="font-body text-sm text-stone/70">Loading map…</p>
    </div>
  ),
});

export default function MapLoader({ items }: { items: Item[] }) {
  return <ExploreMap items={items} />;
}
