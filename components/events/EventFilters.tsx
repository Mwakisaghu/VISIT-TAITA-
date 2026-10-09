import Link from "next/link";
import { eventFilterHref, type EventFilters as Filters } from "@/lib/events-view";

const chip = "focus-ring inline-flex min-h-[44px] shrink-0 items-center rounded-[2px] border px-4 font-body text-[0.8rem] font-semibold transition-colors";
const on = "border-stone bg-stone text-parchment";
const off = "border-stone/30 text-stone hover:border-stone";
const row = "no-scrollbar -mx-6 flex items-center gap-2.5 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0";
const label = "mr-1 shrink-0 font-body text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-stone/70";

const WHEN: [string, string][] = [["today", "Today"], ["weekend", "This weekend"], ["month", "This month"], ["past", "Past events"]];
const SERIES: [string, string][] = [["cup", "Taita Cup"], ["week", "Taita Week"], ["sound", "Taita Sound"]];

/** When, which series, and free only. Plain links: they work without scripts and every combination has its own address. */
export default function EventFilters({ filters }: { filters: Filters }) {
  const any = !!(filters.when || filters.program || filters.free);
  const cur = (k: string) => (filters.program ? Object.entries({ cup: "TAITA_CUP", week: "TAITA_WEEK", sound: "TAITA_SOUND" }).find(([, v]) => v === filters.program)?.[0] === k : false);
  const Chip = ({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) => (
    <Link href={href} aria-current={active ? "true" : undefined} className={`${chip} ${active ? on : off}`}>{children}</Link>
  );
  return (
    <nav aria-label="Filter events" className="flex flex-col gap-3">
      <div className={row}>
        <span className={label}>When</span>
        <Chip href={eventFilterHref(filters, { when: null })} active={!filters.when}>Upcoming</Chip>
        {WHEN.map(([k, l]) => <Chip key={k} href={eventFilterHref(filters, { when: k })} active={filters.when === k}>{l}</Chip>)}
      </div>
      <div className={row}>
        <span className={label}>Series</span>
        {SERIES.map(([k, l]) => <Chip key={k} href={eventFilterHref(filters, { series: k })} active={cur(k)}>{l}</Chip>)}
        <Chip href={eventFilterHref(filters, { free: true })} active={filters.free}>Free tickets only</Chip>
        {any && <Link href="/events" className="focus-ring ml-2 shrink-0 whitespace-nowrap font-body text-[0.8rem] font-semibold text-rust-deep underline underline-offset-4">Clear filters</Link>}
      </div>
    </nav>
  );
}
