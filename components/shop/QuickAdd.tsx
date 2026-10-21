"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/marketplace/CartProvider";

const circle = "focus-ring absolute bottom-2 right-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-stone text-parchment shadow-sm transition-colors hover:bg-rust-deep";
const Icon = ({ d }: { d: string }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

/**
 * The round "+" on a product card's picture. A product with NOTHING to choose is added to the cart straight away (and the button shows a tick for a moment, with the news said aloud for screen readers). A product with
 * sizes or other choices CANNOT be added without one, so there the same button is a link to the product page, named for what it does ("Choose a size for ..."): the choice is never skipped.
 */
export default function QuickAdd({ productId, slug, name, price, image, options, optionLabel }: { productId: string; slug: string; name: string; price: number; image: string; options: string[]; optionLabel: string }) {
  const { addItem } = useCart(); const [added, setAdded] = useState(false); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  if (options.length > 0) return <Link href={`/shop/product/${slug}`} aria-label={`Choose a ${optionLabel.toLowerCase()} for ${name}`} className={circle}><Icon d="M12 5v14M5 12h14" /></Link>;
  return (
    <>
      <button type="button" aria-label={`Add ${name} to your cart`} className={circle} onClick={() => { addItem({ productId, slug, name, price, image, option: null }, 1); setAdded(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setAdded(false), 1500); }}>
        <Icon d={added ? "M5 12.5l4.5 4.5L19 7.5" : "M12 5v14M5 12h14"} />
      </button>
      <span role="status" className="sr-only">{added ? `${name} added to your cart` : ""}</span>
    </>
  );
}
