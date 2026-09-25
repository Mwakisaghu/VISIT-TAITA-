import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import DemoNotice from "@/components/DemoNotice";
import { accommodationTypeLabel, formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function generateStaticParams() {
  const accommodations = await prisma.accommodation.findMany({ select: { slug: true } });
  return accommodations.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const accommodation = await prisma.accommodation.findUnique({ where: { slug: params.slug } });
  if (!accommodation) return {};
  return {
    title: accommodation.name,
    description: accommodation.description,
    openGraph: { images: [accommodation.image] },
  };
}

export const revalidate = 60;

export default async function AccommodationDetailPage({ params }: { params: { slug: string } }) {
  const accommodation = await prisma.accommodation.findUnique({ where: { slug: params.slug } });
  if (!accommodation || accommodation.status !== "PUBLISHED") notFound();

  return (
    <div>
      {/* HERO */}
      <div className="relative h-[52vh] min-h-[320px] w-full overflow-hidden bg-stone">
        <Image
          src={accommodation.image}
          alt={accommodation.name}
          fill
          unoptimized
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone via-stone/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-10">
          <div className="mx-auto max-w-6xl">
            <p className="font-body text-sm text-ochre">
              {accommodationTypeLabel(accommodation.type)} · {accommodation.region}
            </p>
            <h1 className="mt-2 font-display text-4xl text-parchment sm:text-5xl">{accommodation.name}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-16 lg:grid-cols-3">
          {/* DESCRIPTION + AMENITIES */}
          <div className="lg:col-span-2">
            <p className="max-w-prose font-body text-lg leading-relaxed text-stone/85">
              {accommodation.description}
            </p>

            {accommodation.amenities.length > 0 && (
              <div className="mt-10">
                <p className="font-display text-xl text-stone">Amenities</p>
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {accommodation.amenities.map((a) => (
                    <li
                      key={a}
                      className="rounded-sm border border-stone/10 px-4 py-3 font-body text-sm text-stone/80"
                    >
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {accommodation.isDemo && (
              <div className="mt-10">
                <DemoNotice>sample listing — rates, amenities and availability aren&apos;t verified.</DemoNotice>
              </div>
            )}
          </div>

          {/* BOOKING CARD */}
          <aside>
            <div className="sticky top-24 rounded-sm border border-stone/10 p-6">
              <p className="font-body text-xs text-stone/50">From</p>
              <p className="font-display text-3xl text-stone">
                {accommodation.priceFrom ? formatPrice(accommodation.priceFrom) : "Contact for rates"}
              </p>
              {accommodation.priceFrom && <p className="font-body text-xs text-stone/50">per night</p>}

              <div className="mt-6 flex flex-col gap-3">
                {accommodation.contactPhone && (
                  <a
                    href={`tel:${accommodation.contactPhone}`}
                    className="focus-ring rounded-full bg-rust px-6 py-3 text-center font-body text-sm text-parchment hover:bg-rust-deep"
                  >
                    Call {accommodation.contactPhone}
                  </a>
                )}
                {accommodation.contactEmail && (
                  <a
                    href={`mailto:${accommodation.contactEmail}`}
                    className="focus-ring rounded-full border border-stone/20 px-6 py-3 text-center font-body text-sm text-stone hover:border-rust hover:text-rust"
                  >
                    Email to enquire
                  </a>
                )}
                {accommodation.externalBookingUrl && (
                  <a
                    href={accommodation.externalBookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring rounded-full border border-stone/20 px-6 py-3 text-center font-body text-sm text-stone hover:border-rust hover:text-rust"
                  >
                    Book on partner site ↗
                  </a>
                )}
                {!accommodation.contactPhone && !accommodation.contactEmail && !accommodation.externalBookingUrl && (
                  <p className="font-body text-sm text-stone/50">
                    Contact details coming soon — an in-platform enquiry form is on the way.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
