import Link from "next/link";
import Reveal from "@/components/home/Reveal";
import { display, eyebrow } from "@/components/home/ui";
import { lp, tr } from "@/lib/i18n/server";
import { T } from "@/lib/i18n/mark";

// An example of a planned day, so the idea is clear at a glance. (It is an illustration, not a real booking.)
const EXAMPLE = [
  { time: "06:00", what: T("An early start in the hills") },
  { time: "15:00", what: T("Match day") },
  { time: T("Overnight"), what: T("A night in a homestay") },
];

/** "Build your Taita day": the way in to the planner from the homepage. */
export default function PlanSection() {
  return (
    <section id="plan" aria-labelledby="plan-title" className="bg-stone px-6 py-24 text-parchment md:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
        <Reveal>
          <p className={`${eyebrow} text-ochre`}>{tr("Plan")}</p>
          <h2 id="plan-title" className={`${display} mt-6 text-[clamp(1.776rem,3.552vw,3.108rem)] leading-[1.02]`}>{tr("Build your")}<br />{tr("Taita day.")}</h2>
          <p className="mt-6 max-w-md font-body text-lg leading-relaxed text-parchment/80">{tr("Pick a day. Add a hike, a match and somewhere to sleep. See whether it all fits, then share it with whoever is coming.")}</p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link href={lp("/plan")} className="focus-ring inline-flex min-h-[48px] items-center rounded-[2px] bg-rust px-7 font-body text-[0.75rem] font-bold uppercase tracking-[0.2em] text-parchment transition-colors hover:bg-rust-deep">{tr("Start planning")}</Link>
            <p className="font-body text-sm text-parchment/75">{tr("Nothing is booked until you book it.")}</p>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-parchment/70">{tr("An example day")}</p>
          <ol className="mt-5 border-l-2 border-parchment/25">
            {EXAMPLE.map((s) => (
              <li key={tr(s.time)} className="relative pb-8 pl-7 last:pb-0">
                <span aria-hidden="true" className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-rust" />
                <p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-ochre">{tr(s.time)}</p>
                <p className={`${display} mt-1 text-3xl leading-tight`}>{tr(s.what)}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
