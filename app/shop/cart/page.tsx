"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/marketplace/CartProvider";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const { items, setQuantity, removeItem, subtotal } = useCart();
  const { status } = useSession();

  if (items.length === 0) {
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-display text-3xl text-stone">Your cart is empty.</p>
        <Link
          href="/shop"
          className="focus-ring mt-6 inline-block rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          Browse Taita Made
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl text-stone">Your cart</h1>

        <div className="mt-8 divide-y divide-stone/10">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center gap-4 py-5">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-stone/10">
                <Image src={item.image} alt={item.name} fill unoptimized sizes="80px" className="object-cover" />
              </div>
              <div className="flex-1">
                <Link href={`/shop/product/${item.slug}`} className="focus-ring font-display text-lg text-stone">
                  {item.name}
                </Link>
                <p className="font-body text-sm text-stone/60">{formatPrice(item.price)}</p>
              </div>
              <select
                value={item.quantity}
                onChange={(e) => setQuantity(item.productId, Number(e.target.value))}
                className="input"
                aria-label={`Quantity for ${item.name}`}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeItem(item.productId)}
                className="focus-ring font-body text-sm text-stone/40 hover:text-rust"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-stone/10 pt-6">
          <p className="font-body text-stone/70">Subtotal</p>
          <p className="font-display text-2xl text-stone">{formatPrice(subtotal)}</p>
        </div>

        {status === "authenticated" ? (
          <Link
            href="/shop/checkout"
            className="focus-ring mt-6 block w-full rounded-full bg-rust px-6 py-3 text-center font-body text-sm text-parchment hover:bg-rust-deep"
          >
            Checkout
          </Link>
        ) : (
          <div className="mt-6">
            <Link
              href="/login"
              className="focus-ring block w-full rounded-full bg-rust px-6 py-3 text-center font-body text-sm text-parchment hover:bg-rust-deep"
            >
              Sign in to check out
            </Link>
            <p className="mt-2 text-center font-body text-xs text-stone/50">
              Your cart is saved — it&apos;ll still be here after you sign in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
