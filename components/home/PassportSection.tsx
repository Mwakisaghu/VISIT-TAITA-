import type { ComponentType } from "react";
import PassportCta from "@/components/home/PassportCta";
import Reveal from "@/components/home/Reveal";
import { BallIcon, CompassIcon, ForkIcon, MountainIcon, PawIcon, PeopleIcon } from "@/components/home/icons";
import { display, eyebrow } from "@/components/home/ui";

const STAMPS: Array<{ label: string; Icon: ComponentType<{ className?: string }> }> = [
  { label: "Tsavo", Icon: PawIcon }, { label: "Taita Hills", Icon: MountainIcon }, { label: "Culture", Icon: PeopleIcon },
  { label: "Food", Icon: ForkIcon }, { label: "Adventure", Icon: CompassIcon }, { label: "Sport", Icon: BallIcon },
];

// Faint contour lines, like a survey map: they sit behind the passport and say "this is about places".
const CONTOURS = "M-40,420 C140,330 300,470 470,380 S760,300 960,390 M-40,470 C150,385 310,520 480,430 S770,350 960,440 M-40,520 C160,440 320,570 490,480 S780,400 960,490 M-40,370 C130,280 290,420 460,330 S750,250 960,340 M-40,320 C120,230 280,370 450,280 S740,200 960,290 M-40,270 C110,180 270,320 440,230 S730,150 960,240";

export default function PassportSection() {
  return (
    <section id="passport" aria-labelledby="passport-title" className="relative overflow-hidden bg-canopy-deep px-6 py-24 text-parchment md:py-36">
      <svg aria-hidden focusable="false" viewBox="0 0 920 640" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full opacity-[0.13]"><path d={CONTOURS} fill="none" stroke="#C99A3E" strokeWidth="1" /></svg>
      <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        <Reveal innerClassName="flex justify-center lg:justify-start lg:pl-10">
          {/* the passport as an object: a navy cover with gold lettering, tilted on the table */}
          <div aria-hidden className="relative aspect-[3/4] w-[min(68vw,19rem)] -rotate-6 rounded-[6px] bg-gradient-to-br from-[#1b3250] via-[#13233a] to-[#0a1524] shadow-[0_40px_70px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10 transition-transform duration-700 hover:-rotate-3 motion-reduce:transition-none">
            <span className="absolute inset-y-0 left-0 w-3 rounded-l-[6px] bg-gradient-to-r from-black/40 to-transparent" />
            <span className="absolute inset-3 rounded-[3px] border border-ochre/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-ochre">
              <MountainIcon className="h-9 w-9" />
              <p className="mt-5 font-body text-[0.6rem] font-semibold uppercase tracking-[0.5em]">Visit</p>
              <p className={`${display} mt-1 text-5xl uppercase tracking-[0.12em]`}>Taita</p>
              <p className="mt-6 font-body text-[0.65rem] font-semibold uppercase tracking-[0.45em]">Passport</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <p className={`${eyebrow} text-ochre`}>Your Taita passport</p>
          <h2 id="passport-title" className={`${display} mt-6 text-[clamp(2.4rem,4.8vw,4.2rem)] leading-[1.02]`}>Don&apos;t just visit Taita.<br />Experience it.</h2>
          <p className="mt-6 font-body text-lg leading-relaxed text-parchment/80">Discover places.<br />Check in.<br />Collect points.<br />Unlock rewards.</p>

          <ul className="mt-10 grid max-w-md grid-cols-3 gap-x-4 gap-y-7" aria-label="Six ways to earn stamps">
            {STAMPS.map(({ label, Icon }) => (
              <li key={label} className="flex flex-col items-center gap-3 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-ochre/60 text-ochre"><Icon className="h-7 w-7" /></span>
                <span className="font-body text-xs text-parchment/80">{label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 font-body text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-parchment/55">Your first stamp is waiting.</p>
          <div className="mt-8"><PassportCta /></div>
        </Reveal>
      </div>
    </section>
  );
}
