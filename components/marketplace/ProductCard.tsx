import Link from "next/link";
import type { Product } from "@prisma/client";
import { categoryLabel, formatPrice } from "@/lib/format";

export default function ProductCard({ product }: { product: Product }) {
  const outOfStock = product.inventory <= 0;

  return (
    <Link href={`/shop/product/${product.slug}`} className="focus-ring group block">
      <div className="relative aspect-square overflow-hidden rounded-sm bg-stone/10">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {outOfStock && (
          <span className="absolute left-3 top-3 rounded-full bg-stone px-3 py-1 font-body text-xs text-parchment">
            Sold out
          </span>
        )}
      </div>
      <p className="mt-3 font-body text-xs text-rust">{categoryLabel(product.category)}</p>
      <p className="font-display text-lg text-stone">{product.name}</p>
      <p className="mt-1 font-body text-sm text-stone/70">{formatPrice(product.price)}</p>
    </Link>
  );
}
