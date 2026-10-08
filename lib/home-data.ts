// What the homepage shows from the database. Every block is fetched on its own and falls back to "nothing" if it fails, so a slow or
// unavailable database can never blank the homepage: each section has a designed empty state.
import { prisma } from "@/lib/prisma";

export type Pic = { src: string | null; label: string };
export type TileKey = "wild" | "adventure" | "culture" | "stay" | "sport" | "gems";
export type ExperienceItem = { slug: string; name: string; category: string; region: string; image: string };
export type StoryItem = { slug: string; title: string; category: string; excerpt: string; image: string; isDemo: boolean };
export type EventItem = { slug: string; name: string; program: string; eventDate: Date; location: string; ticketing: string; isDemo: boolean };
export type LocalKey = "stay" | "eat" | "experience" | "shop";
export type HomeData = {
  tiles: Record<TileKey, Pic>; people: Pic; land: Pic; storiesPic: Pic;
  experiences: ExperienceItem[]; stories: StoryItem[]; events: EventItem[]; local: Record<LocalKey, Pic>;
};

async function safe<T>(what: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch (e) { console.error(`[home] ${what} could not load:`, (e as Error).message); return fallback; }
}

export const emptyHome = (): HomeData => {
  const none = (label: string): Pic => ({ src: null, label });
  return {
    tiles: { wild: none("Wild"), adventure: none("Adventure"), culture: none("Culture"), stay: none("Stay"), sport: none("Sport"), gems: none("Hidden gems") },
    people: none("The people"), land: none("The land"), storiesPic: none("The stories"), experiences: [], stories: [], events: [],
    local: { stay: none("Stay"), eat: none("Eat"), experience: none("Experience"), shop: none("Shop") },
  };
};

export async function loadHome(now: Date = new Date()): Promise<HomeData> {
  const [places, stays, experiences, stories, events, products] = await Promise.all([
    safe("places", () => prisma.destination.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], select: { name: true, category: true, image: true, featured: true }, take: 80 }), []),
    safe("stays", () => prisma.accommodation.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], select: { name: true, image: true }, take: 6 }), []),
    safe("experiences", () => prisma.experience.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], select: { slug: true, name: true, category: true, region: true, image: true }, take: 8 }), []),
    safe("stories", () => prisma.story.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], select: { slug: true, title: true, category: true, excerpt: true, image: true, isDemo: true }, take: 4 }), []),
    safe("events", () => prisma.event.findMany({ where: { status: "PUBLISHED", eventDate: { gte: now } }, orderBy: { eventDate: "asc" }, select: { slug: true, name: true, program: true, eventDate: true, location: true, ticketing: true, isDemo: true }, take: 3 }), []),
    safe("products", () => prisma.product.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], select: { name: true, image: true }, take: 3 }), []),
  ]);

  const d = emptyHome();
  const used = new Set<string>();
  const first = (cat: string): string | null => { const p = places.find((x) => x.category === cat && x.image && !used.has(x.image)) ?? places.find((x) => x.category === cat && x.image); if (p) used.add(p.image); return p?.image ?? null; };
  d.tiles.wild.src = first("WILD");
  d.tiles.adventure.src = first("ADVENTURE");
  d.tiles.culture.src = first("CULTURE");
  d.tiles.sport.src = first("SPORT");
  d.tiles.stay.src = stays[0]?.image ?? null;
  d.people.src = first("PEOPLE") ?? d.tiles.culture.src;
  // "The land": a wild or adventurous place whose picture isn't already a door above (falls back to the wild door's picture).
  const landPlace = places.find((x) => (x.category === "WILD" || x.category === "ADVENTURE") && x.image && !used.has(x.image));
  if (landPlace) used.add(landPlace.image);
  d.land.src = landPlace?.image ?? d.tiles.wild.src;
  // "Hidden gems": a place that isn't featured and isn't pictured elsewhere on the page.
  const gem = places.find((x) => !x.featured && x.image && !used.has(x.image)) ?? places.find((x) => x.image && !used.has(x.image));
  if (gem) used.add(gem.image);
  d.tiles.gems.src = gem?.image ?? null;
  d.storiesPic.src = stories[0]?.image ?? d.tiles.culture.src;
  d.experiences = experiences;
  d.stories = stories;
  d.events = events;
  d.local.stay.src = stays[1]?.image ?? stays[0]?.image ?? null;
  d.local.eat.src = first("FOOD");
  d.local.experience.src = experiences[0]?.image ?? null;
  d.local.shop.src = products[0]?.image ?? null;
  return d;
}
