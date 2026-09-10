import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DemoNotice from "@/components/DemoNotice";
import AddToCartButton from "@/components/marketplace/AddToCartButton";
import { categoryLabel, formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function generateStaticParams() {
  const products = await prisma.product.findMany({ select: { slug: true } });
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await prisma.product.findUnique({ where: { slug: params.slug } });
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
    openGraph: { images: [product.image] },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({ where: { slug: params.slug } });
  if (!product || product.status !== "PUBLISHED") notFound();

  return (
    <div className="px-6 py-16">
      <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-sm bg-stone/10">
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        </div>

        <div>
          <p className="font-body text-xs text-rust">{categoryLabel(product.category)}</p>
          <h1 className="mt-1 font-display text-3xl text-stone">{product.name}</h1>
          <p className="mt-2 font-display text-2xl text-stone">{formatPrice(product.price)}</p>

          <p className="mt-6 max-w-prose font-body text-stone/80">{product.description}</p>

          <div className="mt-4 flex gap-4 font-body text-xs text-stone/50">
            {product.offersShipping && <span>Ships</span>}
            {product.offersPickup && <span>Local pickup available</span>}
          </div>

          <div className="mt-8">
            <AddToCartButton
              productId={product.id}
              slug={product.slug}
              name={product.name}
              price={product.price}
              image={product.image}
              inventory={product.inventory}
            />
          </div>

          {product.isDemo && (
            <div className="mt-8">
              <DemoNotice>sample product — seller and inventory aren&apos;t verified.</DemoNotice>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
