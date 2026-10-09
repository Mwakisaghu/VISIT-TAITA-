import Link from "next/link";
import { ZONES, ZONE_LABEL, type Zone } from "@/lib/field-guide";

const chip = "focus-ring inline-flex min-h-[44px] shrink-0 items-center rounded-[2px] border px-4 font-body text-[0.8rem] font-semibold transition-colors";

/** "How high": plains, foothills or highlands, as plain links to the same page with ?zone=. Choosing the one that is on turns it off. */
export default function ZoneLinks({ base, current, tone = "light" }: { base: string; current: Zone | null; tone?: "light" | "dark" }) {
  const on = tone === "dark" ? "border-parchment bg-parchment text-stone" : "border-stone bg-stone text-parchment";
  const off = tone === "dark" ? "border-parchment/40 text-parchment hover:border-parchment" : "border-stone/30 text-stone hover:border-stone";
  return (
    <nav aria-label="How high" className="no-scrollbar -mx-6 flex items-center gap-2.5 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
      <span className={`mr-1 shrink-0 font-body text-[0.7rem] font-semibold uppercase tracking-[0.2em] ${tone === "dark" ? "text-parchment/80" : "text-stone/70"}`}>How high</span>
      <Link href={base} aria-current={!current ? "true" : undefined} className={`${chip} ${!current ? on : off}`}>Any height</Link>
      {ZONES.map((z) => (
        <Link key={z} href={current === z ? base : `${base}?zone=${z.toLowerCase()}`} aria-current={current === z ? "true" : undefined} className={`${chip} ${current === z ? on : off}`}>{ZONE_LABEL[z]}</Link>
      ))}
    </nav>
  );
}
