import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";
import SectionHeading from "@/components/SectionHeading";
import SponsorLeadForm from "@/components/sponsors/SponsorLeadForm";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { safeHttpUrl } from "@/lib/url";

export const metadata: Metadata = {
  title: "Sponsor Taita",
  description:
    "Partner with Visit Taita — sponsorship packages for Taita Cup, Taita Week, Taita Wild, Taita Made and more.",
};

export const revalidate = 60;

// What a partnership is built around (from the founding brief's pitch).
const benefits = [
  { title: "Audience access", body: "Reach people planning, visiting and following Taita through the site, stories, events and newsletter." },
  { title: "Destination association", body: "Stand alongside the hills, the wildlife, the culture and the people of Taita Taveta." },
  { title: "Content", body: "Stories and features developed with you, in Visit Taita's editorial voice." },
  { title: "Hospitality", body: "Hosting opportunities at flagship moments like Taita Cup and Taita Week, where your package includes them." },
  { title: "Experiential marketing", body: "Activations on the ground — at events, in the hills, with the community." },
  { title: "Data & insights", body: "Reporting on how your partnership is performing, shared with you." },
  { title: "Measurable outcomes", body: "Goals agreed up front and reviewed together, not logo placement alone." },
];

export default async function SponsorsPage() {
  const [packages, sponsors] = await Promise.all([
    prisma.sponsorPackage.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.sponsor.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-stone px-6 py-24 text-parchment sm:py-32">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-canopy/40 to-transparent sm:block" />
        <div className="relative mx-auto max-w-6xl">
          <p className="font-body text-sm tracking-wide text-ochre">Partner with Taita</p>
          <h1 className="mt-4 font-display text-5xl leading-[0.95] sm:text-7xl">
            More than
            <br />a logo.
          </h1>
          <p className="mt-6 max-w-lg font-body text-lg text-parchment/85">
            Taita Cup. Taita Week. Taita Wild. Back the people and places of Taita Taveta and put
            your brand where the story is being told.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <a
              href="#packages"
              className="focus-ring rounded-full bg-rust px-7 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep"
            >
              See the packages
            </a>
            <a
              href="#enquire"
              className="focus-ring rounded-full border border-parchment/40 px-7 py-3 font-body text-sm text-parchment transition-colors hover:border-ochre hover:text-ochre"
            >
              Start a conversation
            </a>
          </div>
        </div>
      </section>

      {/* WHAT PARTNERSHIP MEANS */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            title="What a partnership is built on"
            description="We don't sell logo placement alone. Every package is shaped around real outcomes for your business."
          />
          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b, i) => (
              <div key={b.title} className="border-t border-stone/15 pt-5">
                <p className="font-body text-xs text-rust">{String(i + 1).padStart(2, "0")}</p>
                <p className="mt-2 font-display text-xl text-stone">{b.title}</p>
                <p className="mt-2 font-body text-sm leading-relaxed text-stone/70">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CURRENT PARTNERS */}
      {sponsors.length > 0 && (
        <section className="bg-parchment-dim/40 px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <p className="font-body text-sm text-stone/60">Our partners</p>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {sponsors.map((s) => {
                const href = safeHttpUrl(s.website);
                const logo = (
                  <div className="relative h-20 w-full">
                    <Image
                      src={s.logo}
                      alt={s.name}
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-contain grayscale transition duration-300 group-hover:grayscale-0"
                    />
                  </div>
                );
                return href ? (
                  <a
                    key={s.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring group rounded-sm border border-stone/10 bg-parchment p-5"
                    aria-label={s.name}
                  >
                    {logo}
                  </a>
                ) : (
                  <div key={s.id} className="group rounded-sm border border-stone/10 bg-parchment p-5">
                    {logo}
                  </div>
                );
              })}
            </div>
            {sponsors.some((s) => s.isDemo) && (
              <div className="mt-6">
                <DemoNotice>sample partners shown for layout review.</DemoNotice>
              </div>
            )}
          </div>
        </section>
      )}

      {/* PACKAGES */}
      <section id="packages" className="scroll-mt-24 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            title="Partnership packages"
            description="Indicative starting points. Every partnership is tailored — start with the package closest to your goals."
          />

          {packages.length > 0 ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((p, i) => {
                const featured = i === 0 && packages.length > 1;
                return (
                  <div
                    key={p.id}
                    className={`flex flex-col rounded-sm border p-7 ${
                      featured
                        ? "border-stone bg-stone text-parchment lg:col-span-1"
                        : "border-stone/15 bg-parchment text-stone"
                    }`}
                  >
                    <p className={`font-display text-2xl ${featured ? "text-parchment" : "text-stone"}`}>
                      {p.name}
                    </p>
                    <p className={`mt-4 font-body text-xs ${featured ? "text-parchment/60" : "text-stone/50"}`}>
                      Indicative, from
                    </p>
                    <p className={`font-display text-3xl ${featured ? "text-ochre" : "text-rust"}`}>
                      {formatPrice(p.startingPrice)}
                      {p.priceNote && (
                        <span className={`ml-2 font-body text-sm ${featured ? "text-parchment/60" : "text-stone/50"}`}>
                          {p.priceNote}
                        </span>
                      )}
                    </p>

                    {p.rights.length > 0 && (
                      <ul className="mt-5 flex flex-wrap gap-2">
                        {p.rights.map((r) => (
                          <li
                            key={r}
                            className={`rounded-full border px-3 py-1 font-body text-xs ${
                              featured ? "border-parchment/25 text-parchment/85" : "border-stone/20 text-stone/75"
                            }`}
                          >
                            {r}
                          </li>
                        ))}
                      </ul>
                    )}

                    <Link
                      href={`/sponsors?package=${p.slug}#enquire`}
                      scroll
                      className={`focus-ring mt-8 inline-block w-fit rounded-full px-6 py-2.5 font-body text-sm transition-colors ${
                        featured
                          ? "bg-rust text-parchment hover:bg-rust-deep"
                          : "border border-stone/25 text-stone hover:border-rust hover:text-rust"
                      }`}
                    >
                      Enquire about this package
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-10 font-body text-stone/60">
              Packages are being finalised — get in touch below and we&apos;ll talk it through.
            </p>
          )}

          <p className="mt-8 max-w-prose font-body text-xs text-stone/50">
            Figures are indicative starting points, not fixed prices. Final terms are agreed with each
            partner.
          </p>
        </div>
      </section>

      {/* ENQUIRE */}
      <section id="enquire" className="scroll-mt-24 bg-parchment-dim/40 px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <SectionHeading
              title="Start a conversation"
              description="Tell us about your business and what you'd like to achieve. We'll come back to you with ideas, not a rate card."
            />
          </div>
          <div className="lg:col-span-3">
            <div className="rounded-sm border border-stone/10 bg-parchment p-6 sm:p-8">
              <Suspense fallback={<p className="font-body text-sm text-stone/50">Loading form…</p>}>
                <SponsorLeadForm packages={packages.map((p) => ({ slug: p.slug, name: p.name }))} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
