import type { MetadataRoute } from "next";
import { discoverCategories, shopCategories } from "@/lib/data";
import { prisma } from "@/lib/prisma";

const base = "https://visittaita.example";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stories, teams, products] = await Promise.all([
    prisma.story.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.sportTeam.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.product.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const staticRoutes = [
    "",
    "/discover",
    "/stories",
    "/events",
    "/events/taita-cup",
    "/shop",
    "/partners",
    "/partners/apply",
    "/map",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  const categoryRoutes = discoverCategories.map((c) => ({
    url: `${base}/discover/${c.key}`,
    lastModified: new Date(),
  }));

  const shopCategoryRoutes = shopCategories.map((c) => ({
    url: `${base}/shop/${c.key}`,
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

  const productRoutes = products.map((p) => ({
    url: `${base}/shop/product/${p.slug}`,
    lastModified: p.updatedAt,
  }));

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...shopCategoryRoutes,
    ...storyRoutes,
    ...teamRoutes,
    ...productRoutes,
  ];
}
