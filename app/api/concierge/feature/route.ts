import { optimizedUrl } from "@/lib/image-src";
import { PUBLIC_MAKER } from "@/lib/makers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** This month's maker and one of their pieces, for the "Take a piece of Taita home" offer. Only a published maker who has consented; nothing private. */
export async function GET() {
  const m = await prisma.maker.findFirst({
    where: PUBLIC_MAKER, orderBy: [{ featured: "desc" }, { name: "asc" }],
    select: { slug: true, name: true, craft: true, village: true, altitudeM: true, products: { where: { status: "PUBLISHED", inventory: { gt: 0 } }, orderBy: [{ featured: "desc" }, { name: "asc" }], take: 1, select: { slug: true, name: true, price: true, image: true } } },
  });
  const body = m ? { maker: { slug: m.slug, name: m.name, craft: m.craft, village: m.village, altitudeM: m.altitudeM }, product: m.products[0] ? { slug: m.products[0].slug, name: m.products[0].name, price: m.products[0].price, image: optimizedUrl(m.products[0].image, 384) } : null } : { maker: null, product: null };
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
