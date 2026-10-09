import Link from "next/link";
import { MOODS, ZONES, ZONE_LABEL, stayFilterHref, type StayFilters as Filters } from "@/lib/field-guide";
import { accommodationTypes } from "@/lib/data";

const chip = "focus-ring inline-flex min-h-[44px] shrink-0 items-center rounded-[2px] border px-4 font-body text-[0.8rem] font-semibold transition-colors";
const on = "border-stone bg-stone text-parchment";
const off = "border-stone/30 text-stone hover:border-stone";
const row = "no-scrollbar -mx-6 flex items-center gap-2.5 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0";
const label = "mr-1 shrink-0 font-body text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-stone/70";

/** Choose by how a stay feels, what kind it is, and how high it sits. Plain links: they work without scripts and every combination has its own address. */
export default function StayFilters({ filters }: { filters: Filters }) {
  const any = !!(filters.type || filters.mood || filters.zone);
  const Chip = ({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) => (
    <Link href={href} aria-current={active ? "true" : undefined} className={`${chip} ${active ? on : off}`}>{children}</Link>
  );
  return (
    <nav aria-label="Filter stays" className="flex flex-col gap-3">
      <div className={row}>
        <span className={label}>I want it</span>
        {MOODS.map((m) => <Chip key={m.key} href={stayFilterHref(filters, { mood: m.key })} active={filters.mood === m.key}>{m.label}</Chip>)}
      </div>
      <div className={row}>
        <span className={label}>Kind</span>
        {accommodationTypes.map((t) => <Chip key={t.key} href={stayFilterHref(filters, { type: t.key })} active={filters.type === t.key.toUpperCase()}>{t.label}</Chip>)}
      </div>
      <div className={row}>
        <span className={label}>How high</span>
        {ZONES.map((z) => <Chip key={z} href={stayFilterHref(filters, { zone: z.toLowerCase() })} active={filters.zone === z}>{ZONE_LABEL[z]}</Chip>)}
        {any && <Link href="/stay" className="focus-ring ml-2 shrink-0 whitespace-nowrap font-body text-[0.8rem] font-semibold text-rust-deep underline underline-offset-4">Clear filters</Link>}
      </div>
    </nav>
  );
}
