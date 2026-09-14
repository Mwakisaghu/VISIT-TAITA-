"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { categoryLabel, categoryToSlug } from "@/lib/format";
import { discoverCategories } from "@/lib/data";

export type MapDestination = {
  id: string;
  slug: string;
  name: string;
  category: string;
  region: string;
  blurb: string;
  image: string;
  latitude: number;
  longitude: number;
};

// Leaflet's default marker icons reference image paths that don't survive a
// webpack bundle — point them at the CDN copy instead of trying to wire up
// local asset handling for three small PNGs.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const TAITA_CENTER: [number, number] = [-3.42, 38.4];

export default function DestinationMap({ destinations }: { destinations: MapDestination[] }) {
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(discoverCategories.map((c) => c.key))
  );

  function toggleCategory(key: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const visible = useMemo(
    () => destinations.filter((d) => activeCategories.has(categoryToSlug(d.category))),
    [destinations, activeCategories]
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {discoverCategories.map((cat) => {
          const active = activeCategories.has(cat.key);
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => toggleCategory(cat.key)}
              className={`focus-ring rounded-full border px-4 py-2 font-body text-sm transition-colors ${
                active
                  ? "border-rust bg-rust text-parchment"
                  : "border-stone/20 text-stone/60 hover:border-rust hover:text-rust"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 h-[70vh] min-h-[420px] overflow-hidden rounded-sm border border-stone/10">
        <MapContainer center={TAITA_CENTER} zoom={10} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {visible.map((d) => (
            <Marker key={d.id} position={[d.latitude, d.longitude]} icon={markerIcon}>
              <Popup>
                <div className="w-48">
                  {/* Plain <img>, deliberately not next/image: this renders
                      inside a Leaflet-managed popup container outside
                      normal document flow, whose size Leaflet computes
                      itself — next/image's fill layout needs a sized
                      parent it can trust, which isn't a safe assumption
                      here. It's a small thumbnail; the tradeoff isn't
                      worth the risk of breaking popup layout. */}
                  <img src={d.image} alt={d.name} className="h-24 w-full rounded-sm object-cover" />
                  <p className="mt-2 text-xs text-rust">{categoryLabel(d.category)}</p>
                  <p className="font-semibold">{d.name}</p>
                  <p className="mt-1 text-xs text-stone/60">{d.region}</p>
                  <Link
                    href={`/discover/${categoryToSlug(d.category)}#${d.slug}`}
                    className="mt-2 inline-block text-xs text-rust underline"
                  >
                    View details
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <p className="mt-4 font-body text-xs text-stone/50">
        {visible.length} of {destinations.length} mapped destinations shown.
      </p>
    </div>
  );
}
