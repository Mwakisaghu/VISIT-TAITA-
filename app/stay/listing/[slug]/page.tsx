import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import DemoNotice from "@/components/DemoNotice";
import ReviewsSection from "@/components/reviews/ReviewsSection";
import AccommodationEnquiryForm from "@/components/listings/AccommodationEnquiryForm";
import { accommodationTypeLabel, formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { safeHttpUrl } from "@/lib/url";

export async function generateStaticParams() {
  const accommodations = await prisma.accommodation.findMany({ select: { slug: true } });
  return accommodations.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const accommodation = await prisma.accommodation.findFirst({
    where: { slug: params.slug, status: "PUBLISHED" },
  });
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

  const bookingUrl = safeHttpUrl(accommodation.externalBookingUrl);
  const hasDirectContact = accommodation.contactPhone || accommodation.contactEmail || bookingUrl;

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
            <div className="sticky top-24 flex flex-col gap-6 rounded-sm border border-stone/10 p-6">
              <div>
                <p className="font-body text-xs text-stone/50">From</p>
                <p className="font-display text-3xl text-stone">
                  {accommodation.priceFrom ? formatPrice(accommodation.priceFrom) : "Contact for rates"}
                </p>
                {accommodation.priceFrom && <p className="font-body text-xs text-stone/50">per night</p>}
              </div>

              <div className="border-t border-stone/10 pt-6">
                <p className="font-display text-lg text-stone">Send an enquiry</p>
                <p className="mt-1 font-body text-xs text-stone/50">
                  Goes straight to {accommodation.name} — no account needed.
                </p>
                <div className="mt-4">
                  <AccommodationEnquiryForm accommodationId={accommodation.id} />
                </div>
              </div>

              {hasDirectContact && (
                <div className="border-t border-stone/10 pt-6">
                  <p className="font-body text-xs text-stone/50">Or contact directly</p>
                  <div className="mt-3 flex flex-col gap-2">
                    {accommodation.contactPhone && (
                      <a
                        href={`tel:${accommodation.contactPhone}`}
                        className="focus-ring font-body text-sm text-stone hover:text-rust"
                      >
                        Call {accommodation.contactPhone}
                      </a>
                    )}
                    {accommodation.contactEmail && (
                      <a
                        href={`mailto:${accommodation.contactEmail}`}
                        className="focus-ring font-body text-sm text-stone hover:text-rust"
                      >
                        Email {accommodation.contactEmail}
                      </a>
                    )}
                    {bookingUrl && (
                      <a
                        href={bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="focus-ring font-body text-sm text-stone hover:text-rust"
                      >
                        Partner booking site ↗
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        <ReviewsSection
          kind="accommodation"
          listingId={accommodation.id}
          listingName={accommodation.name}
          structuredData={{
            description: accommodation.description,
            image: accommodation.image,
            path: `/stay/listing/${accommodation.slug}`,
          }}
        />
      </div>
    </div>
  );
}
