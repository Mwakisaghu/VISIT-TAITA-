import Link from "next/link";
import type { Product } from "@prisma/client";
import Photo from "@/components/home/Photo";
import Tag from "@/components/field/Tag";
import MakerMark from "@/components/shop/MakerMark";
import { altitudeLabel } from "@/lib/field-guide";
import { formatPrice } from "@/lib/format";

export type CardMaker = { slug: string; name: string; village: string; craft: string; altitudeM: number | null };

/** A product with the person behind it: who made it, and where. The maker is passed in only when they are public (consent recorded). */
export default function MakerProductCard({ product: p, maker }: { product: Product; maker: CardMaker | null }) {
  return (
    <article className="flex flex-col">
      <Link href={`/shop/product/${p.slug}`} className="focus-ring group block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2px] bg-canopy-deep">
          <Photo src={p.image} alt="" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" className="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
        </div>
        <h3 className="mt-4 font-display text-xl leading-snug text-stone group-hover:text-rust-deep">{p.name}</h3>
      </Link>
      <p className="mt-1 font-body text-sm font-bold text-stone">{formatPrice(p.price)}</p>
      {maker ? (
        <Link href={`/shop/makers/${maker.slug}`} className="focus-ring mt-3 flex items-center gap-3 font-body text-xs text-stone/85 hover:text-rust-deep">
          <MakerMark name={maker.name} size="sm" />
          <span>By <b>{maker.name}</b><span className="block text-stone/75">Made in {maker.village}{maker.altitudeM != null ? ` · ${altitudeLabel(maker.altitudeM)}` : ""}</span></span>
        </Link>
      ) : (
        <p className="mt-3 flex flex-wrap items-center gap-2 font-body text-xs text-stone/75"><Tag>Made in Taita</Tag></p>
      )}
      {p.inventory <= 0 && <p className="mt-2 font-body text-xs font-semibold text-rust-deep">Sold out</p>}
    </article>
  );
}
