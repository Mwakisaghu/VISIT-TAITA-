import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";
import Photo from "@/components/home/Photo";
import Reveal from "@/components/home/Reveal";
import { ArrowIcon } from "@/components/home/icons";
import { display, eyebrow, textLink } from "@/components/home/ui";
import type { StoryItem } from "@/lib/home-data";

const categoryName = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();

export default function StoriesSection({ stories }: { stories: StoryItem[] }) {
  const [lead, ...rest] = stories;
  return (
    <section aria-labelledby="stories-title" className="bg-parchment-dim/60 px-6 py-24 md:py-36">
      <div className="mx-auto max-w-7xl">
        <Reveal innerClassName="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-6">
            <p className={`${eyebrow} text-rust-deep`}>Taita stories</p>
            <h2 id="stories-title" className={`${display} mt-5 text-[clamp(2.2rem,4.6vw,3.8rem)] leading-[1.05]`}>Real people.<br />Extraordinary stories.</h2>
          </div>
          <div className="lg:col-span-6 lg:pl-10">
            <p className="font-display text-2xl italic leading-snug text-stone/80 md:text-3xl">&ldquo;Before the tourists arrive, the hills already have a story.&rdquo;</p>
          </div>
        </Reveal>

        {lead ? (
          <div className="mt-14 grid gap-10 lg:grid-cols-12">
            <Reveal variant="mask" className="lg:col-span-7">
              <Link href={`/stories/${lead.slug}`} className="focus-ring group relative block aspect-[4/3] overflow-hidden rounded-[2px] bg-gradient-to-br from-canopy-deep to-stone sm:aspect-[16/11]">
                <div className="absolute inset-0 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"><Photo src={lead.image} alt="" sizes="(min-width:1024px) 58vw, 100vw" /></div>
                <div className="absolute inset-0 bg-gradient-to-t from-stone/95 via-stone/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-parchment md:p-10">
                  <p className="font-body text-[0.68rem] font-bold uppercase tracking-[0.26em] text-ochre">{categoryName(lead.category)}</p>
                  <h3 className={`${display} mt-3 max-w-xl text-3xl leading-tight md:text-5xl`}>{lead.title}</h3>
                  <p className="mt-4 hidden max-w-lg font-body leading-relaxed text-parchment/80 md:block">{lead.excerpt}</p>
                  <span className="mt-6 inline-flex items-center gap-2 font-body text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-ochre">Read the story <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </div>
              </Link>
            </Reveal>

            <div className="flex flex-col justify-between gap-8 lg:col-span-5">
              {rest.map((s, i) => (
                <Reveal key={s.slug} delay={i * 120}>
                  <Link href={`/stories/${s.slug}`} className="focus-ring group grid grid-cols-[7.5rem_1fr] gap-5 border-t border-stone/20 pt-6 sm:grid-cols-[10rem_1fr]">
                    <span className="relative block aspect-square overflow-hidden rounded-[2px] bg-gradient-to-br from-canopy to-stone"><Photo src={s.image} alt="" sizes="160px" className="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" /></span>
                    <span>
                      <span className="block font-body text-[0.65rem] font-bold uppercase tracking-[0.24em] text-rust-deep">{categoryName(s.category)}</span>
                      <span className={`${display} mt-2 block text-xl leading-snug transition-colors group-hover:text-rust md:text-2xl`}>{s.title}</span>
                      <span className="mt-2 line-clamp-2 block font-body text-sm leading-relaxed text-stone/70">{s.excerpt}</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
              <Link href="/stories" className={`${textLink} self-start text-stone hover:text-rust`}>All stories <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            </div>
          </div>
        ) : (
          <Reveal className="mt-14 border-t border-stone/20 pt-8">
            <p className="max-w-xl font-body text-lg leading-relaxed text-stone/75">The first stories are being gathered: the people, the places and the things that never make it onto a postcard.</p>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              <Link href="/notes" className={`${textLink} text-stone hover:text-rust`}>Read the field notes <ArrowIcon className="h-4 w-4" /></Link>
              <Link href="/creators" className={`${textLink} text-stone hover:text-rust`}>Join the Field Crew <ArrowIcon className="h-4 w-4" /></Link>
            </div>
          </Reveal>
        )}
        {stories.some((s) => s.isDemo) && <DemoNotice>replace with verified stories before launch.</DemoNotice>}
      </div>
    </section>
  );
}
