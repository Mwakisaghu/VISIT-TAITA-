import Link from "next/link";
import { LEVELS, LEVEL_LABEL, filterHref, type ExperienceFilters as Filters } from "@/lib/field-guide";
import { experienceCategories } from "@/lib/data";

const chip = "focus-ring inline-flex min-h-[44px] shrink-0 items-center rounded-[2px] border px-4 font-body text-[0.8rem] font-semibold transition-colors";
const on = "border-stone bg-stone text-parchment";
const off = "border-stone/30 text-stone hover:border-stone";

/** Filters are plain links, so they work without scripts and every combination has its own shareable address. */
export default function ExperienceFilters({ filters }: { filters: Filters }) {
  const any = !!(filters.type || filters.level || filters.weekend);
  const Chip = ({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) => (
    <Link href={href} aria-current={active ? "true" : undefined} className={`${chip} ${active ? on : off}`}>{children}</Link>
  );
  return (
    <nav aria-label="Filter experiences" className="no-scrollbar -mx-6 flex items-center gap-2.5 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
      <span className="mr-1 hidden font-body text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-stone/70 sm:inline">I&apos;d like to</span>
      {experienceCategories.map((c) => (
        <Chip key={c.key} href={filterHref(filters, { type: c.key })} active={filters.type === c.key.toUpperCase()}>{c.label}</Chip>
      ))}
      <span className="w-3" aria-hidden="true" />
      <Chip href={filterHref(filters, { weekend: true })} active={filters.weekend}>This weekend</Chip>
      {LEVELS.map((l) => (
        <Chip key={l} href={filterHref(filters, { level: l.toLowerCase() })} active={filters.level === l}>{LEVEL_LABEL[l]}</Chip>
      ))}
      {any && <Link href="/experiences" className="focus-ring ml-1 shrink-0 whitespace-nowrap font-body text-[0.8rem] font-semibold text-rust-deep underline underline-offset-4">Clear filters</Link>}
    </nav>
  );
}
