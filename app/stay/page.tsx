import type { Metadata } from "next";
import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";
import AccommodationCard from "@/components/listings/AccommodationCard";
import { accommodationTypes } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Stay in Taita",
  description: "Lodges, hotels, homestays and campsites across Taita Taveta, Kenya.",
};

export const revalidate = 60;

export default async function StayPage() {
  const accommodations = await prisma.accommodation.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });
  const hasDemo = accommodations.some((a) => a.isDemo);

  return (
    <div>
      {/* HEADER */}
      <section className="bg-canopy px-6 py-20 text-parchment">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-sm text-ochre">Stay</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">
            Sleep in the hills,
            <br />
            wake up in Taita.
          </h1>
          <p className="mt-4 max-w-md font-body text-parchment/85">
            Lodges, hotels, homestays and campsites — book directly with the
            people who run them.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-wrap gap-3">
          {accommodationTypes.map((t) => (
            <Link
              key={t.key}
              href={`/stay/${t.key}`}
              className="focus-ring rounded-full border border-stone/20 px-4 py-2 font-body text-sm text-stone transition-colors hover:border-rust hover:text-rust"
            >
              {t.label}
            </Link>
          ))}
        </div>

        {accommodations.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {accommodations.map((a) => (
              <AccommodationCard key={a.slug} accommodation={a} />
            ))}
          </div>
        ) : (
          <p className="mt-10 font-body text-stone/60">No stays published yet.</p>
        )}

        {hasDemo && (
          <div className="mt-10">
            <DemoNotice>sample listings for layout review — rates and availability aren&apos;t verified.</DemoNotice>
          </div>
        )}
      </div>
    </div>
  );
}
