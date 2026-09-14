import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SectionHeading from "@/components/SectionHeading";
import DestinationCard from "@/components/DestinationCard";
import DemoNotice from "@/components/DemoNotice";
import { discoverCategories } from "@/lib/data";
import { slugToCategory } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export function generateStaticParams() {
  return discoverCategories.map((c) => ({ category: c.key }));
}

export function generateMetadata({
  params,
}: {
  params: { category: string };
}): Metadata {
  const cat = discoverCategories.find((c) => c.key === params.category);
  if (!cat) return {};
  return {
    title: `${cat.label} in Taita`,
    description: cat.description,
  };
}

export const revalidate = 60;

export default async function DiscoverCategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const cat = discoverCategories.find((c) => c.key === params.category);
  if (!cat) notFound();

  const items = await prisma.destination.findMany({
    where: { category: slugToCategory(params.category) as any, status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });

  const hasDemo = items.some((d) => d.isDemo);

  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading title={cat.label} description={cat.description} />

        {items.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
            {items.map((d) => (
              <div id={d.slug} key={d.slug}>
                <DestinationCard destination={d} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-10 font-body text-stone/60">
            Places in this world are being verified before publishing. Check
            back soon.
          </p>
        )}

        {hasDemo && (
          <div className="mt-10">
            <DemoNotice>place names are real, descriptions are placeholder.</DemoNotice>
          </div>
        )}
      </div>
    </div>
  );
}
