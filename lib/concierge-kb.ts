import { prisma } from "@/lib/prisma";
import { PUBLIC_MAKER } from "@/lib/makers";
import type { KB } from "@/lib/concierge-ai";

let cache: { at: number; kb: KB } | null = null;
/** What the guide may know: PUBLISHED places, stories, experiences, stays and events, and makers who have consented. Only the few fields it needs; nothing private. Kept for 5 minutes. */
export async function loadKnowledge(now = Date.now()): Promise<KB> {
  if (cache && now - cache.at < 300_000) return cache.kb;
  const [places, stories, experiences, stays, events, makers] = await Promise.all([
    prisma.destination.findMany({ where: { status: "PUBLISHED" }, orderBy: { name: "asc" }, take: 80, select: { slug: true, name: true, region: true, blurb: true, altitudeM: true } }),
    prisma.story.findMany({ where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 40, select: { slug: true, title: true, excerpt: true } }),
    prisma.experience.findMany({ where: { status: "PUBLISHED" }, orderBy: { name: "asc" }, take: 40, select: { slug: true, name: true, region: true, duration: true, priceFrom: true } }),
    prisma.accommodation.findMany({ where: { status: "PUBLISHED" }, orderBy: { name: "asc" }, take: 40, select: { slug: true, name: true, region: true, type: true, priceFrom: true } }),
    prisma.event.findMany({ where: { status: "PUBLISHED", eventDate: { gte: new Date(now) } }, orderBy: { eventDate: "asc" }, take: 20, select: { slug: true, name: true, location: true, eventDate: true } }),
    prisma.maker.findMany({ where: PUBLIC_MAKER, orderBy: { name: "asc" }, take: 30, select: { slug: true, name: true, craft: true, village: true } }),
  ]);
  const kb: KB = { places, stories, experiences, stays: stays.map((s) => ({ ...s, type: String(s.type) })), events: events.map((e) => ({ slug: e.slug, name: e.name, location: e.location, date: e.eventDate.toISOString().slice(0, 10) })), makers };
  cache = { at: now, kb }; return kb;
}
export const resetKnowledgeCache = () => { cache = null; };
