import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SectionHeading from "@/components/SectionHeading";
import ProductCard from "@/components/marketplace/ProductCard";
import { shopCategories } from "@/lib/data";
import { slugToCategory } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export function generateStaticParams() {
  return shopCategories.map((c) => ({ category: c.key }));
}

export function generateMetadata({ params }: { params: { category: string } }): Metadata {
  const cat = shopCategories.find((c) => c.key === params.category);
  if (!cat) return {};
  return { title: cat.label };
}

export const revalidate = 30;

export default async function ShopCategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const cat = shopCategories.find((c) => c.key === params.category);
  if (!cat) notFound();

  const products = await prisma.product.findMany({
    where: { category: slugToCategory(params.category) as any, status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });

  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading title={cat.label} />

        {products.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        ) : (
          <p className="mt-10 font-body text-stone/60">No products in this category yet.</p>
        )}
      </div>
    </div>
  );
}
