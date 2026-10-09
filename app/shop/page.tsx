import type { Metadata } from "next";
import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";
import AltitudeRibbon from "@/components/field/AltitudeRibbon";
import Tag from "@/components/field/Tag";
import MakerMark from "@/components/shop/MakerMark";
import MakerProductCard from "@/components/shop/MakerProductCard";
import { shopCategories } from "@/lib/data";
import { altitudeLabel } from "@/lib/field-guide";
import { PUBLIC_MAKER, isPublicMaker } from "@/lib/makers";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Taita Made",
  description: "Baskets, bead-work, leather, honey, gems and more, made in Taita Taveta by people you can meet.",
};

// Shorter window than other content pages: inventory counts shown here can go stale faster. Actual stock is always re-checked server-side at checkout.
export const revalidate = 30;

const MAKER = { id: true, slug: true, name: true, craft: true, village: true, altitudeM: true, status: true, consentGivenAt: true } as const;

export default async function ShopPage() {
  const [products, makers] = await Promise.all([
    prisma.product.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], include: { maker: { select: MAKER } } }),
    prisma.maker.findMany({
      where: PUBLIC_MAKER, orderBy: [{ featured: "desc" }, { name: "asc" }],
      select: { ...MAKER, story: true, quote: true, isGroup: true, experience: { select: { slug: true, status: true } }, _count: { select: { products: { where: { status: "PUBLISHED" } } } } },
    }),
  ]);
  // The query above only returns makers with consent; this is a second, independent check on the makers attached to products.
  const cards = products.map((p) => ({ product: p, maker: p.maker && isPublicMaker(p.maker) ? p.maker : null }));
  const feature = makers[0]; const others = makers.slice(1);
  const hasDemo = products.some((p) => p.isDemo) || makers.some((m) => (m as { isDemo?: boolean }).isDemo);

  return (
    <div>
      <section className="bg-parchment px-6 pb-8 pt-16 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-rust-deep">Taita Made</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="max-w-3xl font-display text-[clamp(2.6rem,6vw,4.5rem)] font-medium leading-[1.04] tracking-tight text-stone">Meet the people behind what you take home.</h1>
            <p className="max-w-xs font-body text-base text-stone/80">Every piece shows who made it, where, from what, and how long it took.</p>
          </div>
          <nav aria-label="Shop by kind" className="no-scrollbar -mx-6 mt-9 flex gap-2.5 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {shopCategories.map((cat) => (
              <Link key={cat.key} href={`/shop/${cat.key}`} className="focus-ring inline-flex min-h-[44px] shrink-0 items-center rounded-[2px] border border-stone/30 px-4 font-body text-[0.8rem] font-semibold text-stone hover:border-stone">{cat.label}</Link>
            ))}
          </nav>
        </div>
      </section>

      {feature && (
        <section aria-labelledby="feature-title" className="px-6 py-10">
          <div className="mx-auto grid max-w-6xl gap-8 rounded-[2px] border border-stone/15 bg-[#F4EDDC] p-8 sm:p-11 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-rust-deep">Maker of the month</p>
              <div className="mt-5 flex items-center gap-4"><MakerMark name={feature.name} size="lg" /><div><h2 id="feature-title" className="font-display text-3xl font-medium leading-tight text-stone">{feature.name}</h2><p className="mt-1 font-body text-sm text-stone/80">{feature.craft} · {feature.village}</p></div></div>
              {feature.quote && <p className="mt-6 max-w-prose font-display text-xl leading-snug text-stone">&ldquo;{feature.quote}&rdquo;</p>}
              <p className="mt-5 line-clamp-4 max-w-prose font-body text-[0.95rem] text-stone/85">{feature.story}</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href={`/shop/makers/${feature.slug}`} className="focus-ring inline-flex min-h-[44px] items-center rounded-[2px] bg-rust px-5 font-body text-[0.72rem] font-bold uppercase tracking-[0.18em] text-parchment hover:bg-rust-deep">See {feature.isGroup ? "their" : feature.name.split(" ")[0] + "'s"} work<span className="sr-only"> by {feature.name}</span></Link>
                {feature.experience?.status === "PUBLISHED" && <Link href={`/experiences/listing/${feature.experience.slug}`} className="focus-ring inline-flex min-h-[44px] items-center rounded-[2px] border border-stone px-5 font-body text-[0.72rem] font-bold uppercase tracking-[0.18em] text-stone">Visit the workshop</Link>}
              </div>
            </div>
            <div className="self-center">
              {feature.altitudeM != null && <><div className="mb-2"><Tag>{altitudeLabel(feature.altitudeM)}</Tag></div><AltitudeRibbon altitudeM={feature.altitudeM} name={feature.village} /></>}
              <p className="mt-4 font-body text-sm text-stone/80">{feature._count.products} {feature._count.products === 1 ? "piece" : "pieces"} in the shop</p>
            </div>
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section aria-labelledby="makers-title" className="px-6 pb-4 pt-6">
          <div className="mx-auto max-w-6xl">
            <h2 id="makers-title" className="font-display text-3xl text-stone">Meet the makers</h2>
            <ul className="no-scrollbar -mx-6 mt-6 flex gap-4 overflow-x-auto px-6 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {others.map((m) => (
                <li key={m.slug} className="w-64 flex-none sm:w-auto">
                  <Link href={`/shop/makers/${m.slug}`} className="focus-ring flex h-full flex-col rounded-[2px] border border-stone/15 p-5 hover:border-stone/40">
                    <MakerMark name={m.name} />
                    <span className="mt-4 font-display text-xl leading-snug text-stone">{m.name}</span>
                    <span className="mt-1 font-body text-sm text-stone/80">{m.craft}</span>
                    <span className="mt-auto pt-4 font-body text-xs font-semibold text-stone/75">{m.village} · {m._count.products} {m._count.products === 1 ? "piece" : "pieces"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section aria-labelledby="all-title" className="px-6 pb-20 pt-10">
        <div className="mx-auto max-w-6xl">
          <h2 id="all-title" className="font-display text-3xl text-stone">Everything in the shop</h2>
          {cards.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
              {cards.map(({ product, maker }) => <MakerProductCard key={product.slug} product={product} maker={maker} />)}
            </div>
          ) : <p className="mt-6 font-body text-stone/70">No products published yet.</p>}
          {hasDemo && <div className="mt-12"><DemoNotice>sample products and makers for layout review. The makers here are invented; real makers appear only after they have agreed to be named. Sellers and inventory aren&apos;t verified.</DemoNotice></div>}
        </div>
      </section>
    </div>
  );
}
