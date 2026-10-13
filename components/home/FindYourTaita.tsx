import type { ComponentType } from "react";
import Link from "next/link";
import Photo from "@/components/home/Photo";
import Reveal from "@/components/home/Reveal";
import { ArrowIcon, BallIcon, CompassIcon, GemIcon, HouseIcon, MountainIcon, PawIcon } from "@/components/home/icons";
import { display, eyebrow, textLink } from "@/components/home/ui";
import type { Pic, TileKey } from "@/lib/home-data";
import { lp, tr } from "@/lib/i18n/server";
import { T } from "@/lib/i18n/mark";

const TILES: Array<{ key: TileKey; label: string; sub: string; href: string; Icon: ComponentType<{ className?: string }>; tone: string }> = [
  { key: "wild", label: T("Wild"), sub: T("National parks · Wildlife · Landscapes"), href: "/discover/wild", Icon: PawIcon, tone: "from-[#2f5a40] via-canopy-deep to-stone" },
  { key: "adventure", label: T("Adventure"), sub: T("Hiking · Caves · Waterfalls · Cycling"), href: "/discover/adventure", Icon: MountainIcon, tone: "from-[#7a5a34] via-[#3b3226] to-stone" },
  { key: "culture", label: T("Culture"), sub: T("Heritage · Traditions · Food · Communities"), href: "/discover/culture", Icon: CompassIcon, tone: "from-[#a4502a] via-rust-deep to-stone" },
  { key: "stay", label: T("Stay"), sub: T("Hotels · Camps · Lodges · Homestays"), href: "/stay", Icon: HouseIcon, tone: "from-[#8a6a3c] via-[#43341f] to-stone" },
  { key: "sport", label: T("Sport"), sub: T("Events · Football · Running · Taita Cup"), href: "/discover/sport", Icon: BallIcon, tone: "from-[#3c7050] via-canopy to-stone" },
  { key: "gems", label: T("Hidden gems"), sub: T("Places most visitors don't know about"), href: "/map", Icon: GemIcon, tone: "from-[#566a5e] via-[#2b3731] to-stone" },
];

export default function FindYourTaita({ tiles }: { tiles: Record<TileKey, Pic> }) {
  return (
    <section id="find-your-taita" aria-labelledby="find-title" className="scroll-mt-16 bg-parchment px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal innerClassName="flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <div>
            <p className={`${eyebrow} text-rust-deep`}>{tr("Find your Taita")}</p>
            <h2 id="find-title" className={`${display} mt-5 text-[clamp(1.76rem,3.68vw,3.04rem)] leading-[1.05]`}>{tr("What are you looking for?")}</h2>
          </div>
          <div className="max-w-sm">
            <p className="font-body leading-relaxed text-stone/70">{tr("From wildlife and adventure to culture and local flavours — discover what moves you.")}</p>
            <Link href={lp("/discover")} className={`${textLink} mt-5 text-stone hover:text-rust`}>{tr("Explore all")}{" "}<ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
          </div>
        </Reveal>

        <ul className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6 lg:pb-12" aria-label={tr("Ways into Taita")}>
          {TILES.map((t, i) => (
            <li key={t.key} className={i % 2 ? "lg:mt-10" : ""}>
              <Reveal delay={i * 70}>
                <Link href={lp(t.href)} className={`focus-ring group relative flex aspect-[3/4.4] flex-col justify-end overflow-hidden rounded-[2px] bg-gradient-to-b ${t.tone}`}>
                  <div className="absolute inset-0 transition-transform duration-[900ms] ease-out group-hover:scale-[1.07] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                    <Photo src={tiles[t.key].src} alt="" sizes="(min-width:1024px) 16vw, (min-width:640px) 33vw, 50vw" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-stone/95 via-stone/25 to-transparent transition-colors duration-500 group-hover:from-canopy-deep/95" />
                  <div className="relative p-4 text-parchment sm:p-5 transition-transform duration-500 group-hover:-translate-y-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                    <t.Icon className="h-6 w-6 text-ochre" />
                    <p className="mt-3 font-body text-[0.82rem] font-bold uppercase tracking-[0.16em]">{tr(t.label)}</p>
                    <p className="mt-1.5 line-clamp-2 font-body text-xs leading-snug text-parchment/80">{tr(t.sub)}</p>
                    <ArrowIcon className="mt-3 h-4 w-4 -translate-x-2 text-ochre opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100 max-lg:translate-x-0 max-lg:opacity-100" />
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
