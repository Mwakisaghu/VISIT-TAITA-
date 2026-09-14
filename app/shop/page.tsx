import type { Metadata } from "next";
import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";
import DemoNotice from "@/components/DemoNotice";
import ProductCard from "@/components/marketplace/ProductCard";
import { shopCategories } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Taita Made",
  description: "Clothing, art, crafts, food and more, made in Taita Taveta.",
};

// Shorter window than other content pages — inventory counts shown here
// can go stale faster. Actual stock is always re-checked server-side at
// checkout regardless, so this only affects how fresh the displayed
// number looks, not order correctness.
export const revalidate = 30;

export default async function ShopPage() {
  const products = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });
  const hasDemo = products.some((p) => p.isDemo);

  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          title="Taita Made"
          description="Clothing, art, crafts and food — made by people who call Taita home."
        />

        <div className="mt-10 flex flex-wrap gap-3">
          {shopCategories.map((cat) => (
            <Link
              key={cat.key}
              href={`/shop/${cat.key}`}
              className="focus-ring rounded-full border border-stone/20 px-4 py-2 font-body text-sm text-stone transition-colors hover:border-rust hover:text-rust"
            >
              {cat.label}
            </Link>
          ))}
        </div>

        {products.length > 0 ? (
          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        ) : (
          <p className="mt-12 font-body text-stone/60">No products published yet.</p>
        )}

        {hasDemo && (
          <div className="mt-10">
            <DemoNotice>sample products for layout review — sellers and inventory aren&apos;t verified.</DemoNotice>
          </div>
        )}
      </div>
    </div>
  );
}
