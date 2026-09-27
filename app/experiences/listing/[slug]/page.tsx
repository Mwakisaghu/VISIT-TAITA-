import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import DemoNotice from "@/components/DemoNotice";
import ExperienceEnquiryForm from "@/components/listings/ExperienceEnquiryForm";
import { experienceCategoryLabel, formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function generateStaticParams() {
  const experiences = await prisma.experience.findMany({ select: { slug: true } });
  return experiences.map((x) => ({ slug: x.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const experience = await prisma.experience.findUnique({ where: { slug: params.slug } });
  if (!experience) return {};
  return {
    title: experience.name,
    description: experience.description,
    openGraph: { images: [experience.image] },
  };
}

export const revalidate = 60;

export default async function ExperienceDetailPage({ params }: { params: { slug: string } }) {
  const experience = await prisma.experience.findUnique({ where: { slug: params.slug } });
  if (!experience || experience.status !== "PUBLISHED") notFound();

  const facts = [
    experience.duration ? { label: "Duration", value: experience.duration } : null,
    experience.groupSizeMax ? { label: "Max group size", value: `${experience.groupSizeMax} people` } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const hasDirectContact =
    experience.contactPhone || experience.contactEmail || experience.externalBookingUrl;

  return (
    <div>
      {/* HERO */}
      <div className="relative h-[52vh] min-h-[320px] w-full overflow-hidden bg-stone">
        <Image
          src={experience.image}
          alt={experience.name}
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
              {experienceCategoryLabel(experience.category)} · {experience.region}
            </p>
            <h1 className="mt-2 font-display text-4xl text-parchment sm:text-5xl">{experience.name}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-16 lg:grid-cols-3">
          {/* DESCRIPTION + FACTS */}
          <div className="lg:col-span-2">
            <p className="max-w-prose font-body text-lg leading-relaxed text-stone/85">
              {experience.description}
            </p>

            {facts.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-4">
                {facts.map((f) => (
                  <div key={f.label} className="rounded-sm border border-stone/10 px-5 py-4">
                    <p className="font-body text-xs text-stone/50">{f.label}</p>
                    <p className="font-display text-lg text-stone">{f.value}</p>
                  </div>
                ))}
              </div>
            )}

            {experience.isDemo && (
              <div className="mt-10">
                <DemoNotice>sample listing — pricing and availability aren&apos;t verified.</DemoNotice>
              </div>
            )}
          </div>

          {/* BOOKING CARD */}
          <aside>
            <div className="sticky top-24 flex flex-col gap-6 rounded-sm border border-stone/10 p-6">
              <div>
                <p className="font-body text-xs text-stone/50">From</p>
                <p className="font-display text-3xl text-stone">
                  {experience.priceFrom ? formatPrice(experience.priceFrom) : "Contact for pricing"}
                </p>
                {experience.priceFrom && <p className="font-body text-xs text-stone/50">per person</p>}
              </div>

              <div className="border-t border-stone/10 pt-6">
                <p className="font-display text-lg text-stone">Send an enquiry</p>
                <p className="mt-1 font-body text-xs text-stone/50">
                  Goes straight to whoever runs {experience.name} — no account needed.
                </p>
                <div className="mt-4">
                  <ExperienceEnquiryForm experienceId={experience.id} />
                </div>
              </div>

              {hasDirectContact && (
                <div className="border-t border-stone/10 pt-6">
                  <p className="font-body text-xs text-stone/50">Or contact directly</p>
                  <div className="mt-3 flex flex-col gap-2">
                    {experience.contactPhone && (
                      <a
                        href={`tel:${experience.contactPhone}`}
                        className="focus-ring font-body text-sm text-stone hover:text-rust"
                      >
                        Call {experience.contactPhone}
                      </a>
                    )}
                    {experience.contactEmail && (
                      <a
                        href={`mailto:${experience.contactEmail}`}
                        className="focus-ring font-body text-sm text-stone hover:text-rust"
                      >
                        Email {experience.contactEmail}
                      </a>
                    )}
                    {experience.externalBookingUrl && (
                      <a
                        href={experience.externalBookingUrl}
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
      </div>
    </div>
  );
}
