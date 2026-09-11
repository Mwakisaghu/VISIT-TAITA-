import type { Metadata } from "next";
import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";
import { partnerTypeLabel } from "@/lib/format";

export const metadata: Metadata = {
  title: "Partner with Visit Taita",
  description: "Accommodation, experiences, food, transport, events and more — join Visit Taita as a partner.",
};

const partnerTypes = [
  "ACCOMMODATION",
  "EXPERIENCE",
  "FOOD",
  "TRANSPORT",
  "CREATOR",
  "SELLER",
  "EVENT",
  "SPONSOR",
];

export default function PartnersPage() {
  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          title="Partner with Visit Taita"
          description="We work with the people already building Taita's tourism, food, sport and culture scene."
        />

        <p className="mt-8 max-w-prose font-body text-stone/80">
          If you run a lodge, a kitchen, a tour, a matatu route, a stall at
          the market, or you make things worth selling — we want to hear
          from you. Tell us about your business and how you&apos;d like to
          be part of Visit Taita.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {partnerTypes.map((t) => (
            <span
              key={t}
              className="rounded-full border border-stone/20 px-3 py-1 font-body text-xs text-stone/70"
            >
              {partnerTypeLabel(t)}
            </span>
          ))}
        </div>

        <Link
          href="/partners/apply"
          className="focus-ring mt-10 inline-block rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          Apply to partner
        </Link>

        <p className="mt-6 font-body text-sm text-stone/50">
          Already applied?{" "}
          <Link href="/partners/apply" className="text-rust hover:text-rust-deep">
            Check your application status
          </Link>{" "}
          using the same page.
        </p>
      </div>
    </div>
  );
}
