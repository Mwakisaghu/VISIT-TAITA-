import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";
import Reveal from "@/components/home/Reveal";
import { ArrowIcon } from "@/components/home/icons";
import { display, eyebrow, textLink } from "@/components/home/ui";
import { programLabel } from "@/lib/format";
import type { EventItem } from "@/lib/home-data";

const part = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", ...o }).format(d);

export default function EventsSection({ events }: { events: EventItem[] }) {
  return (
    <section aria-labelledby="events-title" className="bg-parchment px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal innerClassName="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className={`${eyebrow} text-rust-deep`}>This week in Taita</p>
            <h2 id="events-title" className={`${display} mt-5 text-[clamp(2rem,4vw,3.3rem)] leading-[1.08]`}>Events · Experiences ·<br className="sm:hidden" /> Places · Stories</h2>
          </div>
          <Link href="/events" className={`${textLink} text-stone hover:text-rust`}>View all events <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
        </Reveal>

        {events.length > 0 ? (
          <ul className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-3">
            {events.map((e, i) => (
              <li key={e.slug}>
                <Reveal delay={i * 110}>
                  <Link href={`/events/${e.slug}`} className="focus-ring group block border-t border-stone/25 pt-6">
                    <div className="flex items-baseline gap-4">
                      <span className={`${display} text-6xl leading-none text-rust md:text-7xl`}>{part(e.eventDate, { day: "numeric" })}</span>
                      <span className="font-body text-xs font-bold uppercase tracking-[0.24em] text-stone/70">{part(e.eventDate, { month: "short" })}<br />{part(e.eventDate, { weekday: "short" })}</span>
                    </div>
                    <p className="mt-6 font-body text-[0.68rem] font-bold uppercase tracking-[0.24em] text-rust-deep">{programLabel(e.program)}</p>
                    <h3 className={`${display} mt-2 text-2xl leading-snug transition-colors group-hover:text-rust md:text-[1.7rem]`}>{e.name}</h3>
                    <p className="mt-2 font-body text-sm text-stone/65">{e.location}</p>
                    {e.ticketing !== "OFF" && <p className="mt-4 inline-block border border-canopy/40 px-3 py-1 font-body text-[0.65rem] font-bold uppercase tracking-[0.2em] text-canopy">{e.ticketing === "FREE" ? "Free tickets" : "Tickets"}</p>}
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        ) : (
          <Reveal className="mt-14 border-t border-stone/25 pt-8">
            <p className="max-w-lg font-body text-lg leading-relaxed text-stone/75">Nothing is on the calendar just yet. When something is planned, it appears here first.</p>
            <Link href="/events" className={`${textLink} mt-6 text-stone hover:text-rust`}>See what&apos;s coming <ArrowIcon className="h-4 w-4" /></Link>
          </Reveal>
        )}
        {events.some((e) => e.isDemo) && <DemoNotice>replace with real events before launch.</DemoNotice>}

        <Reveal className="mt-20">
          <Link href="/events/taita-cup" className="focus-ring group relative block overflow-hidden rounded-[2px] bg-canopy px-8 py-12 text-parchment md:px-14 md:py-16">
            <p className={`${eyebrow} text-ochre-light`}>Taita Cup</p>
            <p className={`${display} mt-4 text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.08]`}>Come for the football.<br />Stay for Taita.</p>
            <p className="mt-4 max-w-md font-body text-parchment/80">Teams, travel packages and match-day festivities come to the hills every season.</p>
            <span className="mt-7 inline-flex items-center gap-2 font-body text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-ochre-light">Standings &amp; fixtures <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
