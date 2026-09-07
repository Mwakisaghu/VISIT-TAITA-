import type { MetadataRoute } from "next";
import { destinations, stories, discoverCategories } from "@/lib/data";

const base = "https://visittaita.example";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/discover", "/stories", "/events"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  const categoryRoutes = discoverCategories.map((c) => ({
    url: `${base}/discover/${c.key}`,
    lastModified: new Date(),
  }));

  const storyRoutes = stories.map((s) => ({
    url: `${base}/stories/${s.slug}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...categoryRoutes, ...storyRoutes];
}
