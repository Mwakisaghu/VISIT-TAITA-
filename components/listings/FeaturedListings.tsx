import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { listingHref, type Referral } from "@/lib/referral";
import { safeHttpUrl } from "@/lib/url";
import { canOptimize } from "@/lib/image-src";

type ListingBrief = {
  slug: string;
  name: string;
  image: string;
  region: string;
  priceFrom: number | null;
  status: string;
};

function Card({ href, brief, kicker, price }: { href: string; brief: ListingBrief; kicker: string; price: string }) {
  const image = safeHttpUrl(brief.image);
  return (
    <Link
      href={href}
      className="focus-ring group flex gap-4 overflow-hidden rounded-sm border border-stone/15 p-3 transition-colors hover:border-rust"
    >
      {image && (
        <span className="relative h-20 w-24 shrink-0 overflow-hidden rounded-sm bg-stone/10">
          <Image src={image} alt="" fill unoptimized={!canOptimize(image)} sizes="96px" className="object-cover" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block font-body text-xs text-rust">{kicker}</span>
        <span className="block truncate font-display text-lg text-stone group-hover:text-rust">{brief.name}</span>
        <span className="block font-body text-xs text-stone/60">
          {brief.region} · {price}
        </span>
      </span>
    </Link>
  );
}

/**
 * The stay and/or experience a mission features, shown on the mission page and on its Field Notes. Links carry
 * where the visitor came from, so an enquiry sent there can be counted for the mission — and the visitor is told
 * that. Only PUBLISHED listings are shown; renders nothing if there is nothing to show.
 */
export default function FeaturedListings({
  stay,
  experience,
  referral,
}: {
  stay: ListingBrief | null;
  experience: ListingBrief | null;
  referral: Referral;
}) {
  const stayShown = stay && stay.status === "PUBLISHED" ? stay : null;
  const experienceShown = experience && experience.status === "PUBLISHED" ? experience : null;
  if (!stayShown && !experienceShown) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-stone">Plan your own visit</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {stayShown && (
          <Card
            href={listingHref(`/stay/listing/${stayShown.slug}`, referral)}
            brief={stayShown}
            kicker="Where to stay"
            price={stayShown.priceFrom ? `From ${formatPrice(stayShown.priceFrom)}/night` : "Contact for rates"}
          />
        )}
        {experienceShown && (
          <Card
            href={listingHref(`/experiences/listing/${experienceShown.slug}`, referral)}
            brief={experienceShown}
            kicker="What to do"
            price={experienceShown.priceFrom ? `From ${formatPrice(experienceShown.priceFrom)}/person` : "Contact for pricing"}
          />
        )}
      </div>
      <p className="mt-3 max-w-prose font-body text-xs text-stone/50">
        If you send an enquiry from one of these links, we record that it started here, so hosts and sponsors can see what a
        mission led to. Nothing else about you is shared.
      </p>
    </section>
  );
}
