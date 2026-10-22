import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { discoverCategories, shopCategories, accommodationTypes, experienceCategories } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { hreflangLinks } from "@/lib/i18n/config";

const base = getSiteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stories, teams, products, accommodations, experiences, creators, missions, notes] = await Promise.all([
    prisma.story.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.sportTeam.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.product.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.accommodation.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.experience.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.creator.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.mission.findMany({
      where: { status: { in: ["OPEN", "CLOSED"] } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.fieldNote.findMany({
      where: { status: "APPROVED" },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  // The homepage exists in four languages: each one is listed, and each says where the others are.
  const homeLanguages = Object.fromEntries(hreflangLinks("/", base, ["sw", "fr", "de"]).map((l) => [l.hreflang, l.href]));
  const homeEntries = ["", "/sw", "/fr", "/de"].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), alternates: { languages: homeLanguages } }));

  const essentialsLanguages = Object.fromEntries(hreflangLinks("/essentials", base, ["sw", "fr", "de"]).map((l) => [l.hreflang, l.href]));
  const essentialsEntries = ["/essentials", "/sw/essentials", "/fr/essentials", "/de/essentials"].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), alternates: { languages: essentialsLanguages } }));

  const staticRoutes = [
    "/discover",
    "/stories",
    "/events",
    "/events/taita-cup",
    "/events/taita-week",
    "/shop",
    "/stay",
    "/experiences",
    "/partners",
    "/partners/apply",
    "/sponsors",
    "/creators",
    "/missions",
    "/notes",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/refunds",
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

  const accommodationTypeRoutes = accommodationTypes.map((t) => ({
    url: `${base}/stay/${t.key}`,
    lastModified: new Date(),
  }));

  const experienceCategoryRoutes = experienceCategories.map((c) => ({
    url: `${base}/experiences/${c.key}`,
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

  const accommodationRoutes = accommodations.map((a) => ({
    url: `${base}/stay/listing/${a.slug}`,
    lastModified: a.updatedAt,
  }));

  const experienceRoutes = experiences.map((x) => ({
    url: `${base}/experiences/listing/${x.slug}`,
    lastModified: x.updatedAt,
  }));

  const creatorRoutes = creators.map((c) => ({
    url: `${base}/creators/${c.slug}`,
    lastModified: c.updatedAt,
  }));

  const missionRoutes = missions.map((m) => ({
    url: `${base}/missions/${m.slug}`,
    lastModified: m.updatedAt,
  }));

  const noteRoutes = notes.map((n) => ({
    url: `${base}/notes/${n.slug}`,
    lastModified: n.updatedAt,
  }));

  return [
    ...homeEntries,
    ...essentialsEntries,
    ...staticRoutes,
    ...categoryRoutes,
    ...shopCategoryRoutes,
    ...accommodationTypeRoutes,
    ...experienceCategoryRoutes,
    ...storyRoutes,
    ...teamRoutes,
    ...productRoutes,
    ...accommodationRoutes,
    ...experienceRoutes,
    ...creatorRoutes,
    ...missionRoutes,
    ...noteRoutes,
  ];
}
