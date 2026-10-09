import { pickSurprise } from "@/lib/explore";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** "Surprise me": send the visitor to a place chosen at random, shown on the map. */
export async function GET() {
  const places = await prisma.destination.findMany({ where: { status: "PUBLISHED", latitude: { not: null }, longitude: { not: null } }, select: { slug: true } });
  const pick = pickSurprise(places.map((p) => ({ kind: "place" as const, slug: p.slug })), Math.random);
  // A relative address, so it also works behind a proxy that hides the real host name.
  return new Response(null, { status: 307, headers: { Location: pick ? `/map?place=${encodeURIComponent(pick.slug)}` : "/discover", "Cache-Control": "no-store" } });
}
