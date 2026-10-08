import Link from "next/link";
import HorizontalRail from "@/components/home/HorizontalRail";
import Photo from "@/components/home/Photo";
import Reveal from "@/components/home/Reveal";
import { ArrowIcon } from "@/components/home/icons";
import { display, eyebrow, textLink } from "@/components/home/ui";
import { experienceCategoryLabel } from "@/lib/format";
import type { ExperienceItem } from "@/lib/home-data";

// When no experiences are published yet, the rail still invites people in: each card opens the area it names.
const INVITES = [
  { name: "Wildlife", note: "Slow mornings, wide skies.", href: "/experiences", tone: "from-[#2f5a40] to-stone" },
  { name: "Adventure", note: "Trails, summits and waterfalls.", href: "/discover/adventure", tone: "from-[#7a5a34] to-stone" },
  { name: "Culture", note: "Heritage, craft and belief.", href: "/discover/culture", tone: "from-[#a4502a] to-stone" },
  { name: "Food", note: "What's cooked, grown and shared.", href: "/discover/food", tone: "from-[#8a6a3c] to-stone" },
  { name: "Sport", note: "Where Taita plays.", href: "/discover/sport", tone: "from-[#3c7050] to-stone" },
];

const card = "focus-ring group relative block aspect-[3/4] w-[74%] shrink-0 snap-start overflow-hidden rounded-[2px] bg-gradient-to-b sm:w-[44%] lg:w-[23.4%]";

export default function ExperiencesSection({ items }: { items: ExperienceItem[] }) {
  return (
    <section aria-labelledby="exp-title" className="bg-parchment px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal innerClassName="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className={`${eyebrow} text-rust-deep`}>Explore Taita</p>
            <h2 id="exp-title" className={`${display} mt-5 text-[clamp(2.2rem,4.6vw,3.8rem)] leading-[1.05]`}>Experiences for<br className="hidden sm:block" /> every kind of explorer.</h2>
          </div>
          <Link href="/experiences" className={`${textLink} text-stone hover:text-rust`}>View all experiences <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
        </Reveal>

        <div className="mt-12">
          <HorizontalRail label="Experiences">
            {items.length > 0
              ? items.map((x) => (
                  <Link key={x.slug} href={`/experiences/listing/${x.slug}`} className={`${card} from-canopy-deep to-stone`}>
                    <div className="absolute inset-0 transition-transform duration-[900ms] ease-out group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"><Photo src={x.image} alt="" sizes="(min-width:1024px) 23vw, (min-width:640px) 44vw, 74vw" /></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-stone/95 via-stone/10 to-transparent" />
                    <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-stone/65 to-transparent" />
                    <p className="absolute left-5 top-5 font-body text-[0.65rem] font-bold uppercase tracking-[0.24em] text-ochre-light">{experienceCategoryLabel(x.category)}</p>
                    <div className="absolute inset-x-0 bottom-0 p-6 text-parchment">
                      <h3 className={`${display} text-2xl leading-tight md:text-[1.7rem]`}>{x.name}</h3>
                      <p className="mt-2 font-body text-sm text-parchment/75">{x.region}</p>
                      <span className="mt-4 inline-flex items-center gap-2 font-body text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-ochre opacity-100 transition-opacity duration-500 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">Discover <ArrowIcon className="h-3.5 w-3.5" /></span>
                    </div>
                  </Link>
                ))
              : INVITES.map((x) => (
                  <Link key={x.name} href={x.href} className={`${card} ${x.tone}`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-stone/80 via-transparent to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6 text-parchment">
                      <h3 className={`${display} text-3xl uppercase`}>{x.name}</h3>
                      <p className="mt-2 font-body text-sm text-parchment/75">{x.note}</p>
                      <span className="mt-4 inline-flex items-center gap-2 font-body text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-ochre">Explore <ArrowIcon className="h-3.5 w-3.5" /></span>
                    </div>
                  </Link>
                ))}
          </HorizontalRail>
        </div>
      </div>
    </section>
  );
}
