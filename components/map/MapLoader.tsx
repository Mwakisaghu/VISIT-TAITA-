"use client";

import dynamic from "next/dynamic";
import type { MapDestination } from "@/components/map/DestinationMap";

const DestinationMap = dynamic(() => import("@/components/map/DestinationMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] min-h-[420px] items-center justify-center rounded-sm border border-stone/10 bg-stone/5">
      <p className="font-body text-sm text-stone/50">Loading map…</p>
    </div>
  ),
});

export default function MapLoader({ destinations }: { destinations: MapDestination[] }) {
  return <DestinationMap destinations={destinations} />;
}
