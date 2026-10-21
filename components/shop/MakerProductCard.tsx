import Link from "next/link";
import type { Product } from "@prisma/client";
import Photo from "@/components/home/Photo";
import MakerMark from "@/components/shop/MakerMark";
import QuickAdd from "@/components/shop/QuickAdd";
import { productCardSizes } from "@/components/shop/grid";
import { formatPrice } from "@/lib/format";
import { cardTitle, makerPlace } from "@/lib/shop-card";

export type CardMaker = { slug: string; name: string; village: string; craft: string; altitudeM: number | null };

/**
 * A product with the person behind it. Small by design (see components/shop/grid.ts): a 4:5 picture carrying the "Made in Taita" badge (the same corner on every card, so cards with and without a maker line match) and,
 * when it can be bought, a round quick-add button; then the title in a fixed two-line slot, the price, and, pinned to the bottom so rows line up, who made it and where. The maker is passed in only when they are public
 * (consent recorded). The whole card is one link through the title (a "stretched" link), so the button and the maker link are never inside another link.
 */
export default function MakerProductCard({ product: p, maker }: { product: Product; maker: CardMaker | null }) {
  const soldOut = p.inventory <= 0;
  return (
    <article className="group relative flex min-w-0 flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[2px] bg-parchment-dim">
        <Photo src={p.image} alt="" sizes={productCardSizes} className="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
        <span className="pointer-events-none absolute left-2 top-2 z-10 bg-parchment px-[7px] py-[5px] font-body text-[0.65rem] font-bold uppercase leading-none tracking-[0.14em] text-stone">Made in Taita</span>
        {soldOut
          ? <span className="pointer-events-none absolute bottom-2 left-2 z-10 rounded-full bg-stone px-3 py-1 font-body text-xs font-semibold text-parchment">Sold out</span>
          : <QuickAdd productId={p.id} slug={p.slug} name={p.name} price={p.price} image={p.image} options={p.options ?? []} optionLabel={p.optionLabel ?? "Size"} />}
      </div>
      <h3 className="mt-3 min-h-[2.5em] break-words font-display text-[1.0625rem] font-medium leading-[1.25] tracking-tight text-stone">
        <Link href={`/shop/product/${p.slug}`} className="focus-ring after:absolute after:inset-0 group-hover:text-rust-deep">{cardTitle(p.name)}</Link>
      </h3>
      <p className="mt-1.5 font-body text-[0.9375rem] font-bold leading-snug tabular-nums text-stone">{formatPrice(p.price)}</p>
      {maker && (
        <Link href={`/shop/makers/${maker.slug}`} className="focus-ring relative z-10 mt-auto flex items-center gap-2 pt-3 font-body text-stone hover:text-rust-deep">
          <MakerMark name={maker.name} size="xs" />
          <span className="min-w-0"><span className="block break-words text-xs font-bold leading-tight">{maker.name}</span><span className="block break-words text-[0.72rem] leading-tight text-stone/80">{makerPlace(maker)}</span></span>
        </Link>
      )}
    </article>
  );
}
