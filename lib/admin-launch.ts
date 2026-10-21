// "Before launch" on the admin overview: what is still sample content showing to visitors. Computed from the database, so it is always true and it disappears by itself once the sample content is gone.
import { prisma } from "@/lib/prisma";

export type LaunchModel = { key: string; one: string; many: string; href: string };
/** The content that can carry the sample-data flag AND is shown to the public when published. */
export const LAUNCH_MODELS: LaunchModel[] = [
  { key: "destination", one: "destination", many: "destinations", href: "/admin/destinations" },
  { key: "story", one: "story", many: "stories", href: "/admin/stories" },
  { key: "event", one: "event", many: "events", href: "/admin/events" },
  { key: "accommodation", one: "accommodation", many: "accommodations", href: "/admin/accommodations" },
  { key: "experience", one: "experience", many: "experiences", href: "/admin/experiences" },
  { key: "product", one: "product", many: "products", href: "/admin/shop/products" },
  { key: "maker", one: "maker", many: "makers", href: "/admin/makers" },
  { key: "festivalSession", one: "Taita Week session", many: "Taita Week sessions", href: "/admin/week/sessions" },
  { key: "sponsor", one: "sponsor", many: "sponsors", href: "/admin/sponsors" },
  { key: "sponsorPackage", one: "sponsor package", many: "sponsor packages", href: "/admin/sponsors/packages" },
  { key: "reward", one: "reward", many: "rewards", href: "/admin/rewards" },
];
export type LaunchItem = { key: string; text: string; count: number; href: string };

/** The to-do list: one line for each kind of content that still has sample items published, the most first. Zero, negative and missing counts are not listed. */
export function launchItems(counts: Record<string, number | undefined>): LaunchItem[] {
  return LAUNCH_MODELS.map((m) => ({ m, n: Math.floor(counts[m.key] ?? 0) }))
    .filter(({ n }) => n > 0)
    .map(({ m, n }) => ({ key: m.key, count: n, href: m.href, text: `${n} sample ${n === 1 ? m.one : m.many} still published` }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
}

/** How many sample items are published in each kind of content. A count that fails shows as nothing, never as an error. */
export async function loadLaunchCounts(db: Record<string, any> = prisma as any): Promise<Record<string, number>> {
  const entries = await Promise.all(LAUNCH_MODELS.map(async (m) => {
    try { return [m.key, Number(await db[m.key].count({ where: { isDemo: true, status: "PUBLISHED" } })) || 0] as const; } catch { return [m.key, 0] as const; }
  }));
  return Object.fromEntries(entries);
}
