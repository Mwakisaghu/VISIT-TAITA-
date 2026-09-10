"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/marketplace/CartProvider";

export default function AddToCartButton({
  productId,
  slug,
  name,
  price,
  image,
  inventory,
}: {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  inventory: number;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (inventory <= 0) {
    return (
      <p className="font-body text-sm text-stone/50">
        Currently sold out — check back soon.
      </p>
    );
  }

  function handleAdd() {
    addItem({ productId, slug, name, price, image }, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        className="input"
        aria-label="Quantity"
      >
        {Array.from({ length: Math.min(inventory, 10) }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleAdd}
        className="focus-ring rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep"
      >
        {added ? "Added ✓" : "Add to cart"}
      </button>
      <button
        type="button"
        onClick={() => {
          addItem({ productId, slug, name, price, image }, quantity);
          router.push("/shop/cart");
        }}
        className="focus-ring rounded-full border border-stone/20 px-6 py-3 font-body text-sm text-stone transition-colors hover:border-rust hover:text-rust"
      >
        Buy now
      </button>
    </div>
  );
}
