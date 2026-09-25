import type { Metadata } from "next";
import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";
import ExperienceCard from "@/components/listings/ExperienceCard";
import { experienceCategories } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Experiences",
  description: "Guided hikes, forest walks, food tours and cultural workshops across Taita Taveta, Kenya.",
};

export const revalidate = 60;

export default async function ExperiencesPage() {
  const experiences = await prisma.experience.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });
  const hasDemo = experiences.some((x) => x.isDemo);

  return (
    <div>
      {/* HEADER */}
      <section className="bg-rust px-6 py-20 text-parchment">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-sm text-parchment/70">Experiences</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">
            Don&apos;t just see Taita.
            <br />
            Do Taita.
          </h1>
          <p className="mt-4 max-w-md font-body text-parchment/85">
            Guided hikes, forest walks, food tours and cultural workshops, led
            by the people who know these hills best.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-wrap gap-3">
          {experienceCategories.map((c) => (
            <Link
              key={c.key}
              href={`/experiences/${c.key}`}
              className="focus-ring rounded-full border border-stone/20 px-4 py-2 font-body text-sm text-stone transition-colors hover:border-rust hover:text-rust"
            >
              {c.label}
            </Link>
          ))}
        </div>

        {experiences.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((x) => (
              <ExperienceCard key={x.slug} experience={x} />
            ))}
          </div>
        ) : (
          <p className="mt-10 font-body text-stone/60">No experiences published yet.</p>
        )}

        {hasDemo && (
          <div className="mt-10">
            <DemoNotice>sample listings for layout review — prices and availability aren&apos;t verified.</DemoNotice>
          </div>
        )}
      </div>
    </div>
  );
}
