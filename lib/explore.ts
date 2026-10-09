import { altitudeZone, ZONES, type Zone } from "@/lib/field-guide";

// What the map and the Discover pages show, and how it is filtered. Pure functions: no database, no map library.
export type Kind = "place" | "stay" | "experience";
export type Item = {
  id: string; kind: Kind; slug: string; name: string; region: string; blurb: string; image: string;
  latitude: number; longitude: number; altitudeM: number | null;
  /** For places: the world (wild, culture, adventure, food, sport, people). For stays and experiences: their type or category, in lower case. */
  world: string; href: string; host: string | null;
};
export type LayerKey = "places" | "stays" | "experiences";
export const LAYERS: { key: LayerKey; label: string; kind: Kind }[] = [{ key: "places", label: "Places", kind: "place" }, { key: "stays", label: "Stays", kind: "stay" }, { key: "experiences", label: "Experiences", kind: "experience" }];
export const DEFAULT_LAYERS: LayerKey[] = ["places", "stays"];
export const WORLDS = ["wild", "culture", "adventure", "food", "sport", "people"] as const;

/** Taita Taveta from Lake Chala in the west to Kasigau in the south-east: the view the map opens on. */
export const TAITA_BOUNDS: [[number, number], [number, number]] = [[-3.95, 37.6], [-3.2, 38.8]];

// ---- Building items from database rows -------------------------------------------------------------------------------------------
type Row = { id: string; slug: string; name: string; region: string; image: string; latitude: number | null; longitude: number | null; altitudeM: number | null };
const ok = (r: Row): r is Row & { latitude: number; longitude: number } => Number.isFinite(r.latitude) && Number.isFinite(r.longitude) && r.latitude !== null && r.longitude !== null;
export function buildItems(places: (Row & { category: string; blurb: string })[], stays: (Row & { type: string; description: string; hostName: string | null })[], experiences: (Row & { category: string; description: string; hostName: string | null })[]): Item[] {
  const short = (v: string | null | undefined) => { const s = String(v ?? "").trim(); return s.length > 160 ? s.slice(0, 159).trimEnd() + "…" : s; }; // never fails on a row with no text
  return [
    ...places.filter(ok).map((r): Item => ({ id: `p:${r.id}`, kind: "place", slug: r.slug, name: r.name, region: r.region, blurb: short(r.blurb), image: r.image, latitude: r.latitude!, longitude: r.longitude!, altitudeM: r.altitudeM, world: r.category.toLowerCase(), href: `/discover/${r.category.toLowerCase()}`, host: null })),
    ...stays.filter(ok).map((r): Item => ({ id: `s:${r.id}`, kind: "stay", slug: r.slug, name: r.name, region: r.region, blurb: short(r.description), image: r.image, latitude: r.latitude!, longitude: r.longitude!, altitudeM: r.altitudeM, world: r.type.toLowerCase(), href: `/stay/listing/${r.slug}`, host: r.hostName })),
    ...experiences.filter(ok).map((r): Item => ({ id: `e:${r.id}`, kind: "experience", slug: r.slug, name: r.name, region: r.region, blurb: short(r.description), image: r.image, latitude: r.latitude!, longitude: r.longitude!, altitudeM: r.altitudeM, world: r.category.toLowerCase(), href: `/experiences/listing/${r.slug}`, host: r.hostName })),
  ];
}

// ---- The address: ?place=slug&world=wild&zone=highlands&layers=places,stays&q=forest ------------------------------------------------
export type View = { place: string | null; world: string | null; zone: Zone | null; layers: LayerKey[]; q: string };
const one = (v: string | string[] | undefined): string => ((Array.isArray(v) ? v[0] : v) ?? "").trim();
export function parseView(sp: Record<string, string | string[] | undefined>): View {
  const place = one(sp.place).toLowerCase(); const world = one(sp.world).toLowerCase(); const zone = one(sp.zone).toUpperCase();
  const layers = one(sp.layers).toLowerCase().split(",").filter((l): l is LayerKey => LAYERS.some((x) => x.key === l));
  return {
    place: /^[a-z0-9-]{1,80}$/.test(place) ? place : null,
    world: (WORLDS as readonly string[]).includes(world) ? world : null,
    zone: (ZONES as string[]).includes(zone) ? (zone as Zone) : null,
    layers: layers.length > 0 ? [...new Set(layers)] : [...DEFAULT_LAYERS],
    q: one(sp.q).replace(/[\u0000-\u001f]/g, " ").slice(0, 60),
  };
}
export function viewQuery(v: View): string {
  const q = new URLSearchParams();
  if (v.place) q.set("place", v.place); if (v.world) q.set("world", v.world); if (v.zone) q.set("zone", v.zone.toLowerCase());
  if (v.layers.join() !== DEFAULT_LAYERS.join()) q.set("layers", v.layers.join(",")); if (v.q.trim()) q.set("q", v.q.trim());
  const s = q.toString(); return s ? `?${s}` : "";
}

// ---- Filtering ------------------------------------------------------------------------------------------------------------------
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
export function filterItems(items: Item[], v: Pick<View, "world" | "zone" | "layers" | "q">): Item[] {
  const kinds = new Set(LAYERS.filter((l) => v.layers.includes(l.key)).map((l) => l.kind)); const q = norm(v.q.trim());
  return items.filter((i) => {
    if (!kinds.has(i.kind)) return false;
    if (v.world && i.kind === "place" && i.world !== v.world) return false; // the world filter applies to places; stays and experiences have their own kinds
    if (v.zone && (i.altitudeM === null || altitudeZone(i.altitudeM) !== v.zone)) return false;
    if (q && !norm(`${i.name} ${i.region} ${i.blurb} ${i.host ?? ""}`).includes(q)) return false;
    return true;
  });
}
export const zoneCounts = (items: Item[]): Record<Zone, number> => { const c: Record<Zone, number> = { PLAINS: 0, FOOTHILLS: 0, HIGHLANDS: 0 }; for (const i of items) if (i.altitudeM !== null) c[altitudeZone(i.altitudeM)]++; return c; };

// ---- Geometry ---------------------------------------------------------------------------------------------------------------------
/** Straight-line distance in kilometres (great circle). */
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180; const dLat = rad(b.latitude - a.latitude), dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
/** The box that holds every item, padded a little; the whole of Taita when there is nothing to show. */
export function boundsOf(items: { latitude: number; longitude: number }[], pad = 0.04): [[number, number], [number, number]] {
  if (items.length === 0) return TAITA_BOUNDS;
  const lat = items.map((i) => i.latitude), lng = items.map((i) => i.longitude);
  return [[Math.min(...lat) - pad, Math.min(...lng) - pad], [Math.max(...lat) + pad, Math.max(...lng) + pad]];
}
export const sortByDistance = <T extends { latitude: number; longitude: number }>(items: T[], from: { latitude: number; longitude: number }): T[] => [...items].sort((a, b) => distanceKm(from, a) - distanceKm(from, b));

// ---- "Surprise me" ----------------------------------------------------------------------------------------------------------------
/** One place at random, from places that are on the map. `rand` returns a number in [0, 1) (Math.random in the app; fixed in tests). */
export function pickSurprise<T extends { kind: string }>(items: T[], rand: () => number): T | null {
  const places = items.filter((i) => i.kind === "place"); if (places.length === 0) return null;
  const n = Math.floor(rand() * places.length); return places[Math.min(places.length - 1, Math.max(0, n))];
}

// ---- How a pin looks (shape and colour carry the kind, so colour is never the only signal) -------------------------------------------
export const WORLD_COLOUR: Record<string, string> = { wild: "#2B4736", culture: "#A6431E", adventure: "#8A6A2C", food: "#7E3117", sport: "#1D3126", people: "#5B4A8A" };
export type Pin = { shape: "circle" | "square" | "diamond"; colour: string };
export const pinOf = (i: Pick<Item, "kind" | "world">): Pin => (i.kind === "place" ? { shape: "circle", colour: WORLD_COLOUR[i.world] ?? "#2B4736" } : i.kind === "stay" ? { shape: "square", colour: "#1B1815" } : { shape: "diamond", colour: "#A6431E" });

/** A map can only be moved when it has a real size. While it is hidden (for example behind the list on a phone) its size is zero, and moving it would produce impossible positions. */
export const usableSize = (width: number, height: number): boolean => Number.isFinite(width) && Number.isFinite(height) && width >= 2 && height >= 2;
