// What the homepage shows from the database. Every block is fetched on its own and falls back to "nothing" if it fails, so a slow or
// unavailable database can never blank the homepage: each section has a designed empty state.
import { prisma } from "@/lib/prisma";

export type Pic = { src: string | null; label: string };
export type TileKey = "wild" | "adventure" | "culture" | "stay" | "sport" | "gems";
export type ExperienceItem = { slug: string; name: string; category: string; region: string; image: string };
export type StoryItem = { slug: string; title: string; category: string; excerpt: string; image: string; isDemo: boolean };
export type EventItem = { slug: string; name: string; program: string; eventDate: Date; location: string; ticketing: string; isDemo: boolean };
export type HomeData = { tiles: Record<TileKey, Pic>; experiences: ExperienceItem[]; stories: StoryItem[]; events: EventItem[] };

async function safe<T>(what: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch (e) { console.error(`[home] ${what} could not load:`, (e as Error).message); return fallback; }
}

export const emptyHome = (): HomeData => {
  const none = (label: string): Pic => ({ src: null, label });
  return {
    tiles: { wild: none("Wild"), adventure: none("Adventure"), culture: none("Culture"), stay: none("Stay"), sport: none("Sport"), gems: none("Hidden gems") },
    experiences: [], stories: [], events: [],
  };
};

export async function loadHome(now: Date = new Date()): Promise<HomeData> {
  const [places, stays, experiences, stories, events] = await Promise.all([
    safe("places", () => prisma.destination.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], select: { name: true, category: true, image: true, featured: true }, take: 80 }), []),
    safe("stays", () => prisma.accommodation.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], select: { name: true, image: true }, take: 6 }), []),
    safe("experiences", () => prisma.experience.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], select: { slug: true, name: true, category: true, region: true, image: true }, take: 8 }), []),
    safe("stories", () => prisma.story.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], select: { slug: true, title: true, category: true, excerpt: true, image: true, isDemo: true }, take: 4 }), []),
    safe("events", () => prisma.event.findMany({ where: { status: "PUBLISHED", eventDate: { gte: now } }, orderBy: { eventDate: "asc" }, select: { slug: true, name: true, program: true, eventDate: true, location: true, ticketing: true, isDemo: true }, take: 3 }), []),
  ]);

  const d = emptyHome();
  const used = new Set<string>();
  const first = (cat: string): string | null => { const p = places.find((x) => x.category === cat && x.image && !used.has(x.image)) ?? places.find((x) => x.category === cat && x.image); if (p) used.add(p.image); return p?.image ?? null; };
  d.tiles.wild.src = first("WILD");
  d.tiles.adventure.src = first("ADVENTURE");
  d.tiles.culture.src = first("CULTURE");
  d.tiles.sport.src = first("SPORT");
  d.tiles.stay.src = stays[0]?.image ?? null;
  // "Hidden gems": a place that isn't featured and isn't pictured elsewhere on the page.
  const gem = places.find((x) => !x.featured && x.image && !used.has(x.image)) ?? places.find((x) => x.image && !used.has(x.image));
  if (gem) used.add(gem.image);
  d.tiles.gems.src = gem?.image ?? null;
  d.experiences = experiences;
  d.stories = stories;
  d.events = events;
  return d;
}
