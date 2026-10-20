import Link from "next/link";
import Reveal from "@/components/home/Reveal";
import { ArrowIcon } from "@/components/home/icons";
import { display, eyebrow, textLink } from "@/components/home/ui";
import { lp, tr } from "@/lib/i18n/server";
import { T } from "@/lib/i18n/mark";

// Four concrete facts, right under the hero, instead of adjectives. Every number here is sourced: distances, travel time and the dry seasons are from the Essentials page (its sources are listed there);
// the height of Vuria (the highest peak of the Taita Hills; sources give 2,209 to 2,228 m, so "over 2,200") and the two birds (the Taita thrush and the Taita apalis, found nowhere else) are from the UNESCO
// World Heritage tentative-list entry for the Taita Hills and BirdLife International's Important Bird Area factsheet for the Taita Hills Forests.
const FACTS = [
  { fig: T("7 hrs"), note: T("by road from Nairobi, about 400 km. Mombasa is about 150 km away."), href: "/essentials#getting-here" },
  { fig: T("Jun–Oct"), note: T("and January–February: the dry seasons, the most comfortable and the best for wildlife in Tsavo."), href: "/essentials#when-to-go" },
  { fig: T("2,200 m+"), note: T("Vuria, the highest peak of the Taita Hills. The hills are cooler than the plains."), href: "/map" },
  { fig: T("2 birds"), note: T("found nowhere else on Earth, the Taita thrush and the Taita apalis, in the hills' cloud forests."), href: "/discover/wild" },
] as const;

export default function HomeFacts() {
  return (
    <section aria-labelledby="facts-title" className="border-b border-stone/10 bg-parchment px-6 py-14 md:py-20">
      <div className="mx-auto max-w-7xl">
        <Reveal innerClassName="flex flex-wrap items-end justify-between gap-4">
          <h2 id="facts-title" className={`${eyebrow} text-rust-deep`}>{tr("Taita at a glance")}</h2>
          <Link href={lp("/essentials")} className={`${textLink} text-stone hover:text-rust`}>{tr("Money, safety and the rest")}{" "}<ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
        </Reveal>
        <ul className="mt-8 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f, i) => (
            <li key={f.href + f.fig}>
              <Reveal delay={i * 90}>
                <Link href={lp(f.href)} className="focus-ring group block border-t border-stone/25 pt-6">
                  <span className={`${display} block text-4xl leading-none text-rust md:text-5xl`}>{tr(f.fig)}</span>
                  <span className="mt-4 block max-w-xs font-body text-[0.95rem] leading-relaxed text-stone/80 transition-colors group-hover:text-stone">{tr(f.note)}</span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
