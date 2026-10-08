import Link from "next/link";
import Photo from "@/components/home/Photo";
import Reveal from "@/components/home/Reveal";
import { ArrowIcon } from "@/components/home/icons";
import { display, eyebrow } from "@/components/home/ui";
import type { LocalKey, Pic } from "@/lib/home-data";

const ITEMS: Array<{ key: LocalKey; label: string; note: string; href: string; tone: string }> = [
  { key: "stay", label: "Stay", note: "Somewhere that feels like part of the journey.", href: "/stay", tone: "from-[#8a6a3c] to-stone" },
  { key: "eat", label: "Eat", note: "What's cooked, grown and shared here.", href: "/discover/food", tone: "from-[#a4502a] to-stone" },
  { key: "experience", label: "Experience", note: "Led by the people who know the way.", href: "/experiences", tone: "from-[#3c7050] to-stone" },
  { key: "shop", label: "Shop", note: "Made in Taita, by people who call it home.", href: "/shop", tone: "from-[#566a5e] to-stone" },
];

export default function StayLocalSection({ local }: { local: Record<LocalKey, Pic> }) {
  return (
    <section aria-labelledby="local-title" className="bg-stone px-6 py-24 text-parchment md:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal innerClassName="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className={`${eyebrow} text-ochre`}>Stay local</p>
            <h2 id="local-title" className={`${display} mt-5 text-[clamp(2.2rem,4.6vw,3.8rem)] leading-[1.05]`}>Support local.<br />Experience more.</h2>
          </div>
          <p className="max-w-md font-body leading-relaxed text-parchment/75 lg:col-span-5">Meet the people making Taita. Real people, real businesses, real stories — real Taita.</p>
        </Reveal>

        <ul className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          {ITEMS.map((it, i) => (
            <li key={it.key}>
              <Reveal delay={i * 90}>
                <Link href={it.href} className={`focus-ring group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[2px] bg-gradient-to-b ${it.tone}`}>
                  <div className="absolute inset-0 transition-transform duration-[900ms] ease-out group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"><Photo src={local[it.key].src} alt="" sizes="(min-width:1024px) 24vw, 48vw" /></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-stone/95 via-stone/25 to-transparent" />
                  <div className="relative p-5">
                    <h3 className="font-body text-sm font-bold uppercase tracking-[0.22em]">{it.label}</h3>
                    <p className="mt-2 max-w-[16rem] font-body text-xs leading-relaxed text-parchment/75">{it.note}</p>
                    <ArrowIcon className="mt-3 h-4 w-4 text-ochre transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
