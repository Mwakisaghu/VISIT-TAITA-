import Link from "next/link";
import type { Event } from "@prisma/client";
import Tag from "@/components/field/Tag";
import PersonChip from "@/components/field/PersonChip";
import ShareLinks from "@/components/events/ShareLinks";
import { eatParts, ticketState } from "@/lib/events-view";
import { programLabel } from "@/lib/format";

const secondary = "focus-ring inline-flex min-h-[44px] items-center justify-center rounded-[2px] border border-stone px-5 font-body text-[0.72rem] font-bold uppercase tracking-[0.18em] text-stone hover:bg-stone hover:text-parchment";
const primary = "focus-ring inline-flex min-h-[44px] items-center justify-center rounded-[2px] bg-rust px-5 font-body text-[0.72rem] font-bold uppercase tracking-[0.18em] text-parchment hover:bg-rust-deep";

type Row = Event & { organiser?: { name: string | null } | null };

/** One event in the list: a big date, what and where, who organises it, what a ticket is, and one clear next step. */
export default function EventRow({ event: e, now, siteUrl }: { event: Row; now: Date; siteUrl?: string }) {
  const d = eatParts(e.eventDate); const tk = ticketState(e, now);
  const buy = tk.kind === "free" || tk.kind === "paid";
  return (
    <article className="grid grid-cols-[4.5rem_1fr] gap-x-5 gap-y-4 border-t border-stone/20 py-7 sm:grid-cols-[6.5rem_1fr_auto] sm:items-center sm:gap-x-8">
      <time dateTime={e.eventDate.toISOString()} className="block">
        <span className="block font-display text-[3.4rem] font-medium leading-[0.9] text-rust-deep sm:text-[4rem]">{d.day}</span>
        <span className="mt-2 block font-body text-[0.65rem] font-bold uppercase tracking-[0.18em] text-stone/80">{d.weekday} · {d.month}</span>
      </time>
      <div>
        <div className="flex flex-wrap gap-1.5"><Tag tone="rust">{programLabel(e.program)}</Tag><Tag>{d.time}</Tag></div>
        <h2 className="mt-3 font-display text-[1.65rem] font-medium leading-tight tracking-tight text-stone"><Link href={`/events/${e.slug}`} className="focus-ring hover:text-rust-deep">{e.name}</Link></h2>
        <p className="mt-1 font-body text-sm text-stone/80">{e.location}</p>
        {e.organiser?.name && <div className="mt-3"><PersonChip size="sm" name={e.organiser.name} verb="Organised by" /></div>}
        <div className="mt-1"><ShareLinks slug={e.slug} name={e.name} date={e.eventDate} location={e.location} siteUrl={siteUrl} /></div>
      </div>
      <div className="col-span-2 flex flex-wrap items-center gap-3 sm:col-span-1 sm:flex-col sm:items-end">
        {tk.label && <Tag tone={buy ? "fill" : "rust"}>{tk.label}</Tag>}
        <Link href={`/events/${e.slug}`} className={buy ? primary : secondary}>{tk.cta}<span className="sr-only"> for {e.name}</span></Link>
      </div>
    </article>
  );
}
