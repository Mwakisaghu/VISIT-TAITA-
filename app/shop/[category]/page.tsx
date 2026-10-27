import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SectionHeading from "@/components/SectionHeading";
import MakerProductCard from "@/components/shop/MakerProductCard";
import { productGrid } from "@/components/shop/grid";
import { shopCategories } from "@/lib/data";
import { slugToCategory } from "@/lib/format";
import { isPublicMaker } from "@/lib/makers";
import { prisma } from "@/lib/prisma";
import { shareMeta } from "@/lib/share-meta";

export function generateStaticParams() {
  return shopCategories.map((c) => ({ category: c.key }));
}

export async function generateMetadata(props: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const params = await props.params;
  const cat = shopCategories.find((c) => c.key === params.category);
  if (!cat) return {};
  return { title: cat.label, ...shareMeta(cat.label, "Made in Taita, by people who call it home.") };
}

export const revalidate = 30;

const MAKER = { id: true, slug: true, name: true, craft: true, village: true, altitudeM: true, status: true, consentGivenAt: true } as const;

export default async function ShopCategoryPage(
  props: {
    params: Promise<{ category: string }>;
  }
) {
  const params = await props.params;
  const cat = shopCategories.find((c) => c.key === params.category);
  if (!cat) notFound();

  const products = await prisma.product.findMany({
    where: { category: slugToCategory(params.category) as any, status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    include: { maker: { select: MAKER } },
  });
  // The same rule as the shop: a maker is shown only when they are public (consent recorded); otherwise the card says only "Made in Taita".
  const cards = products.map((p) => ({ product: p, maker: p.maker && isPublicMaker(p.maker) ? p.maker : null }));

  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading as="h1" title={cat.label} />

        {products.length > 0 ? (
          <div className={`mt-10 ${productGrid}`}>
            {cards.map(({ product, maker }) => (
              <MakerProductCard key={product.slug} product={product} maker={maker} />
            ))}
          </div>
        ) : (
          <p className="mt-10 font-body text-stone/80">No products in this category yet.</p>
        )}
      </div>
    </div>
  );
}
