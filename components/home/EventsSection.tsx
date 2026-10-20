import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";
import Reveal from "@/components/home/Reveal";
import { ArrowIcon } from "@/components/home/icons";
import { display, eyebrow, textLink } from "@/components/home/ui";
import { programLabel } from "@/lib/format";
import type { EventItem } from "@/lib/home-data";
import { cupEvent, eventsEyebrow, otherEvents } from "@/lib/home-events";
import { lp, tr } from "@/lib/i18n/server";
import { T } from "@/lib/i18n/mark";

const part = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", ...o }).format(d);

export default function EventsSection({ events, now = new Date() }: { events: EventItem[]; now?: Date }) {
  const cup = cupEvent(events); const others = otherEvents(events, cup, 3);
  return (
    <section aria-labelledby="events-title" className="bg-parchment px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal innerClassName="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className={`${eyebrow} text-rust-deep`}>{eventsEyebrow(events, now) === "week" ? tr("This week in Taita") : tr("Coming up")}</p>
            <h2 id="events-title" className={`${display} mt-5 text-[clamp(1.6rem,3.2vw,2.64rem)] leading-[1.08]`}>{tr("What's on in the hills.")}</h2>
          </div>
          <Link href={lp("/events")} className={`${textLink} text-stone hover:text-rust`}>{tr("View all events")}{" "}<ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <div className="relative h-full overflow-hidden rounded-[2px] bg-canopy px-8 py-12 text-parchment md:px-14 md:py-16">
              <p className={`${eyebrow} text-ochre-light`}>{tr("Taita Cup")}</p>
              {cup && (
                <div className="mt-6">
                  <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-body text-sm font-semibold uppercase tracking-[0.18em] text-parchment">
                    <span className={`${display} text-5xl normal-case leading-none tracking-tight text-ochre-light`}>{part(cup.eventDate, { day: "numeric" })}</span>
                    <span>{part(cup.eventDate, { month: "short" })} · {part(cup.eventDate, { weekday: "short" })}</span>
                    <span className="text-parchment/75">{cup.location}</span>
                  </p>
                  <Link href={`/events/${cup.slug}`} className={`${display} focus-ring mt-3 inline-block text-xl text-parchment underline decoration-1 underline-offset-[6px] hover:text-ochre-light`}>{cup.name}</Link>
                  {cup.ticketing !== "OFF" && <p className="mt-4"><span className="inline-block border border-ochre-light/50 px-3 py-1 font-body text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ochre-light">{cup.ticketing === "FREE" ? "Free tickets" : "Tickets"}</span></p>}
                </div>
              )}
              <p className={`${display} mt-6 text-[clamp(1.7rem,3.4vw,2.9rem)] leading-[1.05]`}>{tr("Come for the football.")}<br />{tr("Stay for Taita.")}</p>
              <p className="mt-5 max-w-md font-body text-parchment/80">{tr("Teams, travel packages and match-day festivities come to the hills every season.")}</p>
              <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Link href={lp("/events/taita-cup")} className="focus-ring group inline-flex items-center gap-2 font-body text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-ochre-light underline decoration-1 underline-offset-[6px]">{tr("Standings & fixtures")}{" "}<ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                <Link href={lp("/plan")} className="focus-ring group inline-flex items-center gap-2 font-body text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-parchment underline decoration-1 underline-offset-[6px]">{tr("Plan a match day")}{" "}<ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
              </div>
            </div>
          </Reveal>

          <div className="lg:col-span-5">
            {others.length > 0 ? (
              <ul>
                {others.map((e, i) => (
                  <li key={e.slug}>
                    <Reveal delay={i * 110}>
                      <Link href={`/events/${e.slug}`} className="focus-ring group grid grid-cols-[5rem_1fr] gap-5 border-t border-stone/25 py-6">
                        <span>
                          <span className={`${display} block text-4xl leading-none text-rust`}>{part(e.eventDate, { day: "numeric" })}</span>
                          <span className="mt-1 block font-body text-xs font-bold uppercase tracking-[0.2em] text-stone/80">{part(e.eventDate, { month: "short" })} · {part(e.eventDate, { weekday: "short" })}</span>
                        </span>
                        <span>
                          <span className="block font-body text-[0.68rem] font-bold uppercase tracking-[0.24em] text-rust-deep">{programLabel(e.program)}</span>
                          <span className={`${display} mt-1 block text-xl leading-snug transition-colors group-hover:text-rust md:text-2xl`}>{e.name}</span>
                          <span className="mt-1 block font-body text-sm text-stone/80">{e.location}</span>
                          {e.ticketing !== "OFF" && <span className="mt-3 inline-block border border-canopy/40 px-3 py-1 font-body text-[0.65rem] font-bold uppercase tracking-[0.2em] text-canopy">{e.ticketing === "FREE" ? "Free tickets" : "Tickets"}</span>}
                        </span>
                      </Link>
                    </Reveal>
                  </li>
                ))}
              </ul>
            ) : events.length === 0 ? (
              <Reveal className="border-t border-stone/25 pt-8">
                <p className="max-w-lg font-body text-lg leading-relaxed text-stone/75">{tr("Nothing is on the calendar just yet. When something is planned, it appears here first.")}</p>
                <Link href={lp("/events")} className={`${textLink} mt-6 text-stone hover:text-rust`}>{tr("See what's coming")}{" "}<ArrowIcon className="h-4 w-4" /></Link>
              </Reveal>
            ) : null}
          </div>
        </div>
        {events.some((e) => e.isDemo) && <div className="mt-8"><DemoNotice>{tr("event dates and details will be confirmed with the organisers.")}</DemoNotice></div>}
      </div>
    </section>
  );
}
