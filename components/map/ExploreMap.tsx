"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import AltitudeRibbon from "@/components/field/AltitudeRibbon";
import Tag from "@/components/field/Tag";
import Photo from "@/components/home/Photo";
import { discoverCategories } from "@/lib/data";
import { DEFAULT_LAYERS, LAYERS, TAITA_BOUNDS, WORLDS, boundsOf, filterItems, parseView, pinOf, usableSize, viewQuery, zoneCounts, type Item, type LayerKey, type View } from "@/lib/explore";
import { ZONES, ZONE_LABEL, altitudeLabel, type Zone } from "@/lib/field-guide";

const chip = "focus-ring inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-[2px] border px-3.5 font-body text-[0.8rem] font-semibold transition-colors";
const on = "border-stone bg-stone text-parchment", off = "border-stone/30 text-stone hover:border-stone";
const label = "font-body text-[0.65rem] font-bold uppercase tracking-[0.2em] text-stone/75";
const worldLabel = (w: string) => discoverCategories.find((c) => c.key === w)?.label ?? w.charAt(0).toUpperCase() + w.slice(1);
const kindLabel = (i: Item) => (i.kind === "place" ? worldLabel(i.world) : i.kind === "stay" ? "Stay" : "Experience");

/** A pin drawn with CSS (no image files): a circle for places, a square for stays, a diamond for experiences. */
function pinIcon(i: Item, selected: boolean) {
  const p = pinOf(i); const size = selected ? 30 : 22;
  const radius = p.shape === "circle" ? "50%" : "4px"; const rot = p.shape === "diamond" ? "transform:rotate(45deg);" : "";
  const ring = selected ? "box-shadow:0 0 0 3px #ECE3CD,0 0 0 6px #1B1815;" : "box-shadow:0 1px 4px rgba(0,0,0,.45);";
  return L.divIcon({ className: "", html: `<span style="display:block;width:${size}px;height:${size}px;background:${p.colour};border:3px solid #ECE3CD;border-radius:${radius};${rot}${ring}"></span>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

/** Moves the map: to the chosen item, or to fit everything shown. Respects "reduce motion". It waits while the map is hidden (zero size), then moves as soon as it is shown. */
function Camera({ visible, selected, shown }: { visible: Item[]; selected: Item | null; shown: boolean }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const size = map.getSize(); if (!usableSize(size.x, size.y)) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (selected) map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 12), { animate: !reduce, duration: 0.6 });
    else map.fitBounds(boundsOf(visible), { animate: false, maxZoom: 12 });
  }, [map, selected, visible, shown]);
  return null;
}

export default function ExploreMap({ items }: { items: Item[] }) {
  const [view, setView] = useState<Omit<View, "place">>({ world: null, zone: null, layers: [...DEFAULT_LAYERS], q: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pane, setPane] = useState<"list" | "map">("list");
  const [ready, setReady] = useState(false);

  // Start from the address: ?place=ngangao-forest&zone=highlands …
  useEffect(() => {
    const v = parseView(Object.fromEntries(new URLSearchParams(window.location.search)));
    setView({ world: v.world, zone: v.zone, layers: v.layers, q: v.q });
    if (v.place) setSelectedId((items.find((i) => i.slug === v.place && i.kind === "place") ?? items.find((i) => i.slug === v.place))?.id ?? null);
    setReady(true);
  }, [items]);

  const visible = useMemo(() => filterItems(items, view), [items, view]);
  const selected = useMemo(() => visible.find((i) => i.id === selectedId) ?? null, [visible, selectedId]);

  // Keep the address in step, so any view can be shared.
  useEffect(() => { if (ready) window.history.replaceState(null, "", window.location.pathname + viewQuery({ ...view, place: selected?.slug ?? null })); }, [ready, view, selected]);

  const counts = useMemo(() => zoneCounts(filterItems(items, { ...view, zone: null })), [items, view]);
  const toggleLayer = (k: LayerKey) => setView((v) => ({ ...v, layers: v.layers.includes(k) ? v.layers.filter((x) => x !== k) : [...v.layers, k] }));
  const choose = (id: string) => { setSelectedId(id); setPane("map"); };
  const reset = () => { setView({ world: null, zone: null, layers: [...DEFAULT_LAYERS], q: "" }); setSelectedId(null); };

  return (
    <div>
      <div className="mb-4 flex gap-2 lg:hidden" role="group" aria-label="Show">
        <button type="button" aria-pressed={pane === "list"} onClick={() => setPane("list")} className={`${chip} ${pane === "list" ? on : off}`}>List</button>
        <button type="button" aria-pressed={pane === "map"} onClick={() => setPane("map")} className={`${chip} ${pane === "map" ? on : off}`}>Map</button>
      </div>

      <div className="grid gap-6 lg:h-[46rem] lg:grid-cols-[27rem_1fr]">
        <div className={`${pane === "list" ? "block" : "hidden"} min-h-0 lg:flex lg:flex-col lg:overflow-hidden lg:rounded-[2px] lg:border lg:border-stone/20`}>
          <div className="flex flex-col gap-3 pb-3 lg:border-b lg:border-stone/20 lg:p-4">
            <div>
              <label htmlFor="map-q" className={label}>Search places, stays, experiences</label>
              <input id="map-q" type="search" value={view.q} maxLength={60} onChange={(e) => setView((v) => ({ ...v, q: e.target.value }))} placeholder="Try “forest” or “homestay”" className="mt-1.5 min-h-[44px] w-full rounded-[2px] border border-stone/30 bg-transparent px-3.5 font-body text-sm text-stone placeholder:text-stone/60" />
            </div>
            <div role="group" aria-label="Show on the map" className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {LAYERS.map((l) => (
                <label key={l.key} className="flex min-h-[44px] items-center gap-2 font-body text-sm text-stone"><input type="checkbox" checked={view.layers.includes(l.key)} onChange={() => toggleLayer(l.key)} /> {l.label}</label>
              ))}
            </div>
            <div role="group" aria-label="World" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              <button type="button" aria-pressed={!view.world} onClick={() => setView((v) => ({ ...v, world: null }))} className={`${chip} ${!view.world ? on : off}`}>All worlds</button>
              {WORLDS.map((w) => <button key={w} type="button" aria-pressed={view.world === w} onClick={() => setView((v) => ({ ...v, world: v.world === w ? null : w }))} className={`${chip} ${view.world === w ? on : off}`}>{worldLabel(w)}</button>)}
            </div>
            <div role="group" aria-label="How high" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              <button type="button" aria-pressed={!view.zone} onClick={() => setView((v) => ({ ...v, zone: null }))} className={`${chip} ${!view.zone ? on : off}`}>Any height</button>
              {ZONES.map((z: Zone) => <button key={z} type="button" aria-pressed={view.zone === z} onClick={() => setView((v) => ({ ...v, zone: v.zone === z ? null : z }))} className={`${chip} ${view.zone === z ? on : off}`}>{ZONE_LABEL[z]} <span className="text-stone/70" aria-hidden="true">{counts[z]}</span><span className="sr-only">, {counts[z]} shown</span></button>)}
            </div>
            <p role="status" className={label}>{visible.length} {visible.length === 1 ? "item" : "items"} in view</p>
          </div>

          {selected && (
            <section aria-label={`About ${selected.name}`} className="border-y border-stone/20 bg-[#F4EDDC] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-1.5"><Tag tone="fill">{kindLabel(selected)}</Tag>{selected.altitudeM !== null && <Tag>{altitudeLabel(selected.altitudeM)}</Tag>}</div>
                <button type="button" onClick={() => setSelectedId(null)} className="focus-ring -mr-2 -mt-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center font-body text-sm font-semibold text-stone underline underline-offset-4">Close<span className="sr-only"> {selected.name}</span></button>
              </div>
              <h2 className="mt-3 font-display text-2xl leading-tight text-stone">{selected.name}</h2>
              <p className="mt-1 font-body text-sm text-stone/80">{selected.region}{selected.host ? ` · ${selected.kind === "experience" ? "Led by" : "Hosted by"} ${selected.host}` : ""}</p>
              <p className="mt-3 font-body text-sm text-stone/85">{selected.blurb}</p>
              {selected.altitudeM !== null && <div className="mt-3"><AltitudeRibbon altitudeM={selected.altitudeM} /></div>}
              <Link href={selected.href} className="focus-ring mt-3 inline-flex min-h-[44px] items-center font-body text-sm font-semibold text-rust-deep underline underline-offset-4">{selected.kind === "place" ? `More in ${worldLabel(selected.world)}` : selected.kind === "stay" ? "See this stay" : "See this experience"}<span aria-hidden="true">&nbsp;→</span></Link>
            </section>
          )}

          <div className="min-h-0 flex-1 lg:overflow-y-auto">
            {visible.length > 0 ? (
              <ul>
                {visible.map((i) => (
                  <li key={i.id}>
                    <button type="button" aria-pressed={i.id === selected?.id} onClick={() => choose(i.id)} className={`focus-ring flex w-full gap-4 border-b border-stone/15 p-4 text-left ${i.id === selected?.id ? "bg-[#F4EDDC]" : "hover:bg-[#F4EDDC]/60"}`}>
                      <span className="relative h-20 w-20 flex-none overflow-hidden rounded-[2px] bg-canopy-deep"><Photo src={i.image} alt="" sizes="80px" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap gap-1.5"><Tag>{kindLabel(i)}</Tag>{i.altitudeM !== null && <Tag>{altitudeLabel(i.altitudeM)}</Tag>}</span>
                        <span className="mt-2 block font-display text-lg leading-snug text-stone">{i.name}</span>
                        <span className="block font-body text-xs text-stone/80">{i.region}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6">
                <p className="font-display text-xl text-stone">Nothing matches that.</p>
                <button type="button" onClick={reset} className="focus-ring mt-3 inline-flex min-h-[44px] items-center font-body text-sm font-semibold text-rust-deep underline underline-offset-4">Clear filters</button>
              </div>
            )}
          </div>
        </div>

        <div className={`${pane === "map" ? "block" : "hidden"} lg:block`}>
          <div role="region" aria-label="Map of Taita Taveta" className="h-[28rem] overflow-hidden rounded-[2px] border border-stone/20 lg:h-full">
            <MapContainer bounds={TAITA_BOUNDS} className="h-full w-full" scrollWheelZoom>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Camera visible={visible} selected={selected} shown={pane === "map"} />
              {visible.map((i) => (
                <Marker key={`${i.id}:${i.id === selected?.id}`} position={[i.latitude, i.longitude]} icon={pinIcon(i, i.id === selected?.id)} title={`${i.name}, ${kindLabel(i)}`} alt={`${i.name}, ${kindLabel(i)}`} eventHandlers={{ click: () => setSelectedId(i.id) }} />
              ))}
            </MapContainer>
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-body text-xs text-stone/80">
            <span className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="inline-block h-3 w-3 rounded-full bg-canopy" /> Place (colour = world)</span>
            <span className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="inline-block h-3 w-3 rounded-[2px] bg-stone" /> Stay</span>
            <span className="inline-flex items-center gap-1.5"><i aria-hidden="true" className="inline-block h-2.5 w-2.5 rotate-45 bg-rust" /> Experience</span>
          </p>
        </div>
      </div>
    </div>
  );
}
