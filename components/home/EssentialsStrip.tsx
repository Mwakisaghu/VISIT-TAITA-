import Link from "next/link";
import Reveal from "@/components/home/Reveal";
import { display, eyebrow } from "@/components/home/ui";
import { T } from "@/lib/i18n/mark";
import { lp, tr } from "@/lib/i18n/server";

const ITEMS = [
  { id: "getting-here", title: T("Getting here"), note: T("By train, coach or car, and the last stretch by matatu.") },
  { id: "when-to-go", title: T("When to go"), note: T("Dry seasons, the rains, and cooler hills.") },
  { id: "money", title: T("Money"), note: T("Shillings, M-Pesa and park fees.") },
  { id: "staying-safe", title: T("Staying safe"), note: T("Wildlife, hiking and who to call.") },
];

/** The first practical questions, near the top of the homepage: a newcomer needs these before anything about passports or missions. */
export default function EssentialsStrip() {
  return (
    <section id="essentials" aria-labelledby="essentials-title" className="bg-parchment px-6 py-20 md:py-24">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className={`${eyebrow} text-rust-deep`}>{tr("Visitor essentials")}</p>
          <h2 id="essentials-title" className={`${display} mt-5 text-[clamp(1.76rem,3.68vw,3.04rem)] leading-[1.05] text-stone`}>{tr("Before you come.")}</h2>
          <p className="mt-4 max-w-xl font-body text-lg text-stone/85">{tr("How to get here, when to go, how to pay and how to stay safe.")}</p>
        </Reveal>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((it) => (
            <li key={it.id}>
              <Link href={lp(`/essentials#${it.id}`)} className="focus-ring group block h-full rounded-[3px] border border-stone/20 p-6 transition-colors hover:border-rust hover:bg-[#F4EDDC]">
                <span className="block font-display text-2xl text-stone group-hover:text-rust-deep">{tr(it.title)}</span>
                <span className="mt-2 block font-body text-sm leading-snug text-stone/80">{tr(it.note)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
