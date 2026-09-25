import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SectionHeading from "@/components/SectionHeading";
import ExperienceCard from "@/components/listings/ExperienceCard";
import { experienceCategories } from "@/lib/data";
import { slugToCategory } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export function generateStaticParams() {
  return experienceCategories.map((c) => ({ category: c.key }));
}

export function generateMetadata({ params }: { params: { category: string } }): Metadata {
  const c = experienceCategories.find((x) => x.key === params.category);
  if (!c) return {};
  return { title: c.label, description: c.description };
}

export const revalidate = 60;

export default async function ExperienceCategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const c = experienceCategories.find((x) => x.key === params.category);
  if (!c) notFound();

  const experiences = await prisma.experience.findMany({
    where: { category: slugToCategory(params.category) as any, status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });

  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading title={c.label} description={c.description} />

        {experiences.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((x) => (
              <ExperienceCard key={x.slug} experience={x} />
            ))}
          </div>
        ) : (
          <p className="mt-10 font-body text-stone/60">No {c.label.toLowerCase()} experiences listed yet.</p>
        )}
      </div>
    </div>
  );
}
