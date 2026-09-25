import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SectionHeading from "@/components/SectionHeading";
import AccommodationCard from "@/components/listings/AccommodationCard";
import { accommodationTypes } from "@/lib/data";
import { slugToCategory } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export function generateStaticParams() {
  return accommodationTypes.map((t) => ({ type: t.key }));
}

export function generateMetadata({ params }: { params: { type: string } }): Metadata {
  const t = accommodationTypes.find((x) => x.key === params.type);
  if (!t) return {};
  return { title: t.label, description: t.description };
}

export const revalidate = 60;

export default async function StayTypePage({ params }: { params: { type: string } }) {
  const t = accommodationTypes.find((x) => x.key === params.type);
  if (!t) notFound();

  const accommodations = await prisma.accommodation.findMany({
    where: { type: slugToCategory(params.type) as any, status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });

  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading title={t.label} description={t.description} />

        {accommodations.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {accommodations.map((a) => (
              <AccommodationCard key={a.slug} accommodation={a} />
            ))}
          </div>
        ) : (
          <p className="mt-10 font-body text-stone/60">No {t.label.toLowerCase()} listed yet.</p>
        )}
      </div>
    </div>
  );
}
