import Link from "next/link";
import Landscape from "@/components/home/Landscape";
import HeroVideo from "@/components/home/HeroVideo";
import Parallax from "@/components/home/Parallax";
import Photo from "@/components/home/Photo";
import { ArrowIcon, PlayIcon } from "@/components/home/icons";
import { display, eyebrow, primaryCta } from "@/components/home/ui";
import { DEFAULT_HERO_IMAGE, type HomeMedia } from "@/lib/home-media";
import { lp, tr } from "@/lib/i18n/server";
import { T } from "@/lib/i18n/mark";

export default function HomeHero({ media }: { media: HomeMedia }) {
  const alt = media.heroImage === DEFAULT_HERO_IMAGE ? "Early light over a ridge landscape" : "The landscape of Taita Taveta";
  return (
    <section aria-labelledby="home-title" className="grain relative isolate flex min-h-[100svh] items-end overflow-hidden bg-stone text-parchment">
      <Parallax speed={0.2} className="absolute -inset-y-[10%] inset-x-0 -z-10">
        <Landscape className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 animate-kenburns motion-reduce:animate-none">
          <Photo src={media.heroImage} alt={alt} sizes="100vw" priority />
        </div>
        {media.heroVideo && <HeroVideo src={media.heroVideo} poster={media.heroImage} />}
      </Parallax>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-stone via-stone/10 to-stone/55" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-stone/75 via-stone/25 to-transparent" />

      <div className="relative mx-auto w-full max-w-7xl px-6 pb-24 pt-44 md:pb-32">
        <p className={`${eyebrow} text-ochre`}>{tr("Taita Taveta · Kenya")}</p>
        <h1 id="home-title" className={`${display} mt-6 text-[clamp(2.1rem,6.3vw,5.7rem)] uppercase leading-[0.88] [text-shadow:0_2px_40px_rgba(0,0,0,0.35)]`}>{tr("More than")}<br />{tr("a place.")}</h1>
        <p className="mt-8 font-body text-xl font-medium text-parchment md:text-2xl">{tr("Wild. Cultural. Unexpected.")}</p>
        <p className="mt-3 max-w-md font-body text-base leading-relaxed text-parchment/80">{tr("Discover the landscapes, people, stories and experiences that make Taita different.")}</p>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
          <Link href={lp("/plan")} className={primaryCta}>{tr("Plan your day")}{" "}<ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
          {media.storyUrl ? (
            <a href={lp(media.storyUrl)} target="_blank" rel="noopener noreferrer" className="focus-ring group inline-flex items-center gap-3 font-body text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-parchment">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-parchment/50 transition-colors group-hover:border-ochre group-hover:text-ochre"><PlayIcon className="ml-0.5 h-4 w-4" /></span>{tr("Watch the story")}<span className="sr-only">{" "}{tr("(opens in a new tab)")}</span>
            </a>
          ) : (
            <Link href={lp("/stay")} className="focus-ring group inline-flex items-center gap-3 font-body text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-parchment">{tr("Find a stay")}{" "}<ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </div>

      <a href={lp("#find-your-taita")} className="focus-ring absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 font-body text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-parchment/70 transition-colors hover:text-parchment md:flex">{tr("Scroll to explore")}<span aria-hidden className="block h-9 w-px animate-hint bg-parchment/70 motion-reduce:animate-none" />
      </a>
    </section>
  );
}
