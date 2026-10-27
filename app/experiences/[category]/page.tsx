import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SectionHeading from "@/components/SectionHeading";
import DemoNotice from "@/components/DemoNotice";
import ExperienceCard from "@/components/listings/ExperienceCard";
import { experienceCategories } from "@/lib/data";
import { slugToCategory } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/reviews-data";
import { shareMeta } from "@/lib/share-meta";

export function generateStaticParams() {
  return experienceCategories.map((c) => ({ category: c.key }));
}

export async function generateMetadata(props: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const params = await props.params;
  const c = experienceCategories.find((x) => x.key === params.category);
  if (!c) return {};
  { const _t = c.label; const _d = c.description; return { title: _t, description: _d, ...shareMeta(_t, _d) }; }
}

export const revalidate = 60;

export default async function ExperienceCategoryPage(
  props: {
    params: Promise<{ category: string }>;
  }
) {
  const params = await props.params;
  const c = experienceCategories.find((x) => x.key === params.category);
  if (!c) notFound();

  const experiences = await prisma.experience.findMany({
    where: { category: slugToCategory(params.category) as any, status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });

  // One grouped query for the whole page — not one per card.
  const ratings = await getRatingSummaries("experience", experiences.map((x) => x.id));

  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading as="h1" title={c.label} description={c.description} />

        {experiences.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((x) => (
              <ExperienceCard key={x.slug} experience={x} rating={ratings.get(x.id) ?? null} />
            ))}
          </div>
        ) : (
          <p className="mt-10 font-body text-stone/80">No {c.label.toLowerCase()} experiences listed yet.</p>
        )}

        {experiences.some((x) => x.isDemo) && (
          <div className="mt-10">
            <DemoNotice>sample listings for layout review — prices and availability aren&apos;t verified.</DemoNotice>
          </div>
        )}
      </div>
    </div>
  );
}
