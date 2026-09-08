import type { MetadataRoute } from "next";
import { discoverCategories } from "@/lib/data";
import { prisma } from "@/lib/prisma";

const base = "https://visittaita.example";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stories, teams] = await Promise.all([
    prisma.story.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.sportTeam.findMany({ select: { slug: true, updatedAt: true } }),
  ]);

  const staticRoutes = ["", "/discover", "/stories", "/events", "/events/taita-cup"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  const categoryRoutes = discoverCategories.map((c) => ({
    url: `${base}/discover/${c.key}`,
    lastModified: new Date(),
  }));

  const storyRoutes = stories.map((s) => ({
    url: `${base}/stories/${s.slug}`,
    lastModified: s.updatedAt,
  }));

  const teamRoutes = teams.map((t) => ({
    url: `${base}/events/taita-cup/teams/${t.slug}`,
    lastModified: t.updatedAt,
  }));

  return [...staticRoutes, ...categoryRoutes, ...storyRoutes, ...teamRoutes];
}
