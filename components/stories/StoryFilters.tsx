import Link from "next/link";
import { STORY_TYPES, storyFilterHref, type StoryFilters as Filters } from "@/lib/stories-view";
import { categoryLabel } from "@/lib/format";

const chip = "focus-ring inline-flex min-h-[44px] shrink-0 items-center rounded-[2px] border px-4 font-body text-[0.8rem] font-semibold transition-colors";

/** Filter stories by what they are about. Plain links: they work without scripts and every view has its own address. */
export default function StoryFilters({ filters }: { filters: Filters }) {
  return (
    <nav aria-label="Filter stories" className="no-scrollbar -mx-6 flex items-center gap-2.5 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
      <Link href="/stories" aria-current={!filters.type ? "true" : undefined} className={`${chip} ${!filters.type ? "border-stone bg-stone text-parchment" : "border-stone/30 text-stone hover:border-stone"}`}>All</Link>
      {Object.entries(STORY_TYPES).map(([key, enumValue]) => {
        const active = filters.type === enumValue;
        return <Link key={key} href={storyFilterHref(filters, key)} aria-current={active ? "true" : undefined} className={`${chip} ${active ? "border-stone bg-stone text-parchment" : "border-stone/30 text-stone hover:border-stone"}`}>{categoryLabel(enumValue)}</Link>;
      })}
    </nav>
  );
}
