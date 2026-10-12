import Link from "next/link";
import MakerMark from "@/components/shop/MakerMark";
import { hoursLabel, parseHowMade } from "@/lib/makers";

type PublicMaker = { slug: string; name: string; craft: string; village: string } | null;

/** The part of a product page about where it comes from: the maker (only if public), the material, the time it takes and the steps. Nothing if there is nothing to say. */
export default function ProductProvenance({ product, maker }: { product: { material: string | null; madeInHours: number | null; howMade: string | null }; maker: PublicMaker }) {
  const steps = parseHowMade(product.howMade); const hours = hoursLabel(product.madeInHours);
  if (!maker && !product.material && !hours && steps.length === 0) return null;
  return (
    <section aria-labelledby="provenance-title" className="mt-8 border-t border-stone/15 pt-6">
      <h2 id="provenance-title" className="font-body text-[0.7rem] font-bold uppercase tracking-[0.22em] text-rust-deep">Where it comes from</h2>
      {maker && (
        <Link href={`/shop/makers/${maker.slug}`} className="focus-ring mt-4 flex items-center gap-4">
          <MakerMark name={maker.name} />
          <span className="font-body text-sm text-stone"><span className="text-stone/75">Made by</span> <b className="font-display text-lg font-medium">{maker.name}</b><span className="block text-xs text-stone/75">{maker.craft} · {maker.village}</span></span>
        </Link>
      )}
      {(product.material || hours) && (
        <p className="mt-4 font-body text-sm text-stone/85">{[product.material, hours].filter(Boolean).join(" · ")}</p>
      )}
      {steps.length > 0 && (
        <>
          <h3 className="mt-6 font-display text-xl text-stone">How it was made</h3>
          <ol className="mt-3 flex flex-col gap-3">
            {steps.map((s, i) => (
              <li key={i} className="grid grid-cols-[1.75rem_1fr] gap-3 font-body text-sm text-stone/85"><span aria-hidden="true" className="font-display text-xl leading-none text-rust-deep">{i + 1}</span><span>{s}</span></li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
