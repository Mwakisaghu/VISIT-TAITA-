"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/marketplace/CartProvider";
import { DEFAULT_OPTION_LABEL } from "@/lib/product-options";

export default function AddToCartButton({
  productId,
  slug,
  name,
  price,
  image,
  inventory,
  options = [],
  optionLabel = DEFAULT_OPTION_LABEL,
}: {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  inventory: number;
  /** Sizes (or other choices). When there are any, one must be chosen before the item can be added. */
  options?: string[];
  optionLabel?: string;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [option, setOption] = useState("");
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const label = optionLabel.toLowerCase();

  if (inventory <= 0) {
    return <p className="font-body text-sm text-stone/50">Currently sold out — check back soon.</p>;
  }

  /** Adds the item — or, if a size is needed and not chosen yet, says so and does nothing. Returns whether it was added. */
  function add(): boolean {
    if (options.length > 0 && !option) {
      setError(`Please choose a ${label}.`);
      return false;
    }
    setError("");
    addItem({ productId, slug, name, price, image, option: options.length > 0 ? option : null, optionLabel: options.length > 0 ? optionLabel : undefined }, quantity);
    return true;
  }

  return (
    <div className="flex flex-col gap-3">
      {options.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="font-body text-sm text-stone/70">{optionLabel}</span>
          <select
            value={option}
            onChange={(e) => {
              setOption(e.target.value);
              setError("");
            }}
            className="input w-fit min-w-[10rem]"
            aria-label={optionLabel}
            aria-invalid={error ? true : undefined}
          >
            <option value="">Choose a {label}</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex items-center gap-3">
        <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="input" aria-label="Quantity">
          {Array.from({ length: Math.min(inventory, 10) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            if (add()) {
              setAdded(true);
              setTimeout(() => setAdded(false), 1500);
            }
          }}
          className="focus-ring rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep"
        >
          {added ? "Added ✓" : "Add to cart"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (add()) router.push("/shop/cart");
          }}
          className="focus-ring rounded-full border border-stone/20 px-6 py-3 font-body text-sm text-stone transition-colors hover:border-rust hover:text-rust"
        >
          Buy now
        </button>
      </div>

      {error && (
        <p role="alert" className="font-body text-sm text-rust">
          {error}
        </p>
      )}
    </div>
  );
}
