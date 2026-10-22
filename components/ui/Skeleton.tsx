import type { ReactNode } from "react";

// Placeholders shown while a list page's results arrive from the database. They hold the SAME space as the real cards (the shapes below are copied from them, and a test fails if a card changes without its
// placeholder following), so the page does not jump when the content appears. They are decorative (hidden from screen readers; one polite "Loading..." announcement per region), cannot be focused or clicked,
// show no made-up text or pictures, and stop pulsing for visitors who have asked their device for less motion.
export const SHAPES = {
  place: "min-h-[24rem]",
  experience: "min-h-[32rem]",
  stayImage: "aspect-[4/3]",
  stayFeature: "min-h-[22rem] lg:min-h-[32rem]",
  eventRow: "grid grid-cols-[4.5rem_1fr] gap-x-5 gap-y-4 border-t border-stone/20 py-7 sm:grid-cols-[6.5rem_1fr_auto] sm:items-center sm:gap-x-8",
} as const;

type Tone = "light" | "dark";
const fill = (tone: Tone) => (tone === "dark" ? "bg-parchment/15" : "bg-stone/10");

export function SkeletonBlock({ className = "", tone = "light" }: { className?: string; tone?: Tone }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-[2px] motion-reduce:animate-none ${fill(tone)} ${className}`} />;
}

/** One polite announcement ("Loading stories") for everything inside; the blocks themselves are silent. */
export function LoadingRegion({ label, children }: { label: string; children: ReactNode }) {
  return <div role="status" aria-live="polite" aria-busy="true"><span className="sr-only">{label}</span>{children}</div>;
}

const STORY_HEIGHTS = ["min-h-[22rem]", "min-h-[30rem]", "min-h-[26rem]", "min-h-[28rem]", "min-h-[24rem]", "min-h-[32rem]"];
/** Where the stories go: an optional large cover, then three columns of covers of different heights, like the real page. */
export function StoriesSkeleton({ withFeature }: { withFeature: boolean }) {
  return (
    <section className="px-6 pb-24 pt-8">
      <div className="mx-auto max-w-6xl">
        <LoadingRegion label="Loading stories">
          {withFeature && <div className="mb-10"><SkeletonBlock className="min-h-[26rem] sm:min-h-[30rem]" /></div>}
          <div className="columns-1 gap-8 sm:columns-2 lg:columns-3">
            {STORY_HEIGHTS.map((h, i) => <div key={i} className="mb-8 break-inside-avoid"><SkeletonBlock className={h} /></div>)}
          </div>
        </LoadingRegion>
      </div>
    </section>
  );
}

/** Where the events go (the left column): a group heading and rows with a date block, a title and a button, like the real rows. */
export function EventListSkeleton() {
  return (
    <LoadingRegion label="Loading events">
      {[3, 2].map((rows, g) => (
        <div key={g} className="mb-10">
          <SkeletonBlock className="h-3 w-32" />
          <div className="mt-3">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className={SHAPES.eventRow}>
                <SkeletonBlock className="h-[4.5rem] w-full" />
                <div className="flex flex-col gap-3"><SkeletonBlock className="h-4 w-40" /><SkeletonBlock className="h-7 w-full max-w-md" /><SkeletonBlock className="h-4 w-3/4 max-w-sm" /></div>
                <SkeletonBlock className="col-span-2 h-11 w-36 sm:col-span-1" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

/** Where the first world of places goes: the dark chapter with its three tall cards. */
export function DiscoverSkeleton() {
  return (
    <section className="bg-canopy-deep px-6 py-16 text-parchment sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[18rem_1fr] lg:gap-14">
        <LoadingRegion label="Loading places">
          <div className="flex flex-col gap-4">
            <SkeletonBlock tone="dark" className="h-16 w-24" />
            <SkeletonBlock tone="dark" className="h-10 w-40" />
            <SkeletonBlock tone="dark" className="h-4 w-56" />
            <SkeletonBlock tone="dark" className="h-4 w-44" />
          </div>
        </LoadingRegion>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((i) => <SkeletonBlock key={i} tone="dark" className={SHAPES.place} />)}
        </div>
      </div>
    </section>
  );
}

const GRID = "mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3";
/** Where the experiences go: the count line, then a grid of tall cover cards. */
export function ExperiencesSkeleton() {
  return (
    <section className="px-6 pb-20 pt-6">
      <div className="mx-auto max-w-6xl">
        <LoadingRegion label="Loading experiences">
          <SkeletonBlock className="h-4 w-32" />
          <div className={GRID}>{[0, 1, 2].map((i) => <SkeletonBlock key={i} className={SHAPES.experience} />)}</div>
        </LoadingRegion>
      </div>
    </section>
  );
}

function StayCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[2px] border border-stone/15">
      <SkeletonBlock className={`${SHAPES.stayImage} w-full rounded-none`} />
      <div className="flex flex-col gap-3 p-5"><SkeletonBlock className="h-4 w-24" /><SkeletonBlock className="h-6 w-4/5" /><SkeletonBlock className="h-4 w-full" /><SkeletonBlock className="mt-3 h-5 w-28" /></div>
    </div>
  );
}
/** Where the stays go: an optional large feature, the count line, then a grid of cards with a 4:3 picture. */
export function StaysSkeleton({ withFeature }: { withFeature: boolean }) {
  return (
    <section className="px-6 pb-20 pt-6">
      <div className="mx-auto max-w-6xl">
        <LoadingRegion label="Loading stays">
          {withFeature && <div className="mb-10 grid overflow-hidden rounded-[2px] border border-stone/15 lg:grid-cols-[1.25fr_1fr]"><SkeletonBlock className={`${SHAPES.stayFeature} rounded-none`} /><div className="flex flex-col justify-center gap-4 p-8 sm:p-11"><SkeletonBlock className="h-4 w-28" /><SkeletonBlock className="h-10 w-3/4" /><SkeletonBlock className="h-4 w-full" /><SkeletonBlock className="h-4 w-5/6" /></div></div>}
          <SkeletonBlock className="h-4 w-28" />
          <div className={GRID}>{[0, 1, 2].map((i) => <StayCardSkeleton key={i} />)}</div>
        </LoadingRegion>
      </div>
    </section>
  );
}
