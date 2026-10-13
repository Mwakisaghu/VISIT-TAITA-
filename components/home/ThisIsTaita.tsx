import Link from "next/link";
import Photo from "@/components/home/Photo";
import Reveal from "@/components/home/Reveal";
import { ArrowIcon } from "@/components/home/icons";
import { display, eyebrow, textLink } from "@/components/home/ui";
import type { Pic } from "@/lib/home-data";
import { lp, tr } from "@/lib/i18n/server";
import { T } from "@/lib/i18n/mark";

type Panel = { label: string; sub: string; href: string; pic: Pic; tone: string; shape: string };

/** An editorial spread: the headline stays put (on wide screens) while three pictures of different sizes scroll past it. */
export default function ThisIsTaita({ people, land, stories }: { people: Pic; land: Pic; stories: Pic }) {
  const panels: Panel[] = [
    { label: T("The people"), sub: T("Meet the communities shaping Taita."), href: "/discover/people", pic: people, tone: "from-rust-deep via-[#4a2a1c] to-stone", shape: "col-span-2 aspect-[16/10]" },
    { label: T("The land"), sub: T("From the hills of Taita to the wild landscapes of Tsavo."), href: "/discover/wild", pic: land, tone: "from-[#2f5a40] via-canopy-deep to-stone", shape: "col-span-2 aspect-[4/5] sm:col-span-1" },
    { label: T("The stories"), sub: T("Places, traditions and stories worth discovering."), href: "/stories", pic: stories, tone: "from-[#7a5a34] via-[#3b3226] to-stone", shape: "col-span-2 aspect-[4/5] sm:col-span-1 sm:mt-20" },
  ];
  return (
    <section aria-labelledby="this-title" className="bg-canopy-deep px-6 py-24 text-parchment md:py-36">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-12">
        <Reveal className="self-start lg:sticky lg:top-32 lg:col-span-4">
          <p className={`${eyebrow} text-ochre`}>{tr("This is Taita")}</p>
          <h2 id="this-title" className={`${display} mt-6 text-[clamp(1.924rem,3.7vw,3.256rem)] leading-[1]`}>{tr("There is more here")}<br className="hidden sm:block" />{" "}{tr("than you expect.")}</h2>
          <p className="mt-7 max-w-sm font-body leading-relaxed text-parchment/75">{tr("From the people who call it home, to the landscapes that take your breath away — Taita is a place of extraordinary stories, culture and natural beauty.")}</p>
          <Link href={lp("/stories")} className={`${textLink} mt-9 text-ochre hover:text-parchment`}>{tr("Explore the stories")}{" "}<ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
        </Reveal>

        <div className="grid grid-cols-2 gap-5 lg:col-span-8">
          {panels.map((p, i) => (
            <Reveal key={tr(p.label)} variant="mask" delay={i * 120} className={p.shape}>
              <Link href={lp(p.href)} className={`focus-ring group relative block h-full w-full overflow-hidden rounded-[2px] bg-gradient-to-br ${p.tone}`}>
                <div className="absolute inset-0 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                  <Photo src={p.pic.src} alt="" sizes="(min-width:1024px) 40vw, 90vw" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-stone/90 via-stone/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                  <p className="font-body text-[0.72rem] font-bold uppercase tracking-[0.24em] text-ochre">0{i + 1}</p>
                  <h3 className={`${display} mt-2 text-3xl uppercase md:text-3xl`}>{tr(p.label)}</h3>
                  <p className="mt-2 max-w-xs font-body text-sm leading-relaxed text-parchment/80">{tr(p.sub)}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
