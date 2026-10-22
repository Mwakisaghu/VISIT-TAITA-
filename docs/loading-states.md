# Loading states (placeholders while a list page's results arrive)

On a slow phone, a page that reads the database used to show nothing until everything was ready. The five list pages that read the database on every visit (`/stories`, `/events`, `/discover`, `/experiences`, `/stay`) now send their heading and filters **first**, with a placeholder of the right shape where the results will go, and the results follow.

## How it is built
- Each page keeps its heading and filters in `page.tsx` and wraps the database-driven part in `<Suspense>`: `StoryResults`, `EventList`, `DiscoverChapters`, `ExperiencesResults`, `StayResults` (in `components/<area>/`).
- The placeholders are in `components/ui/Skeleton.tsx`. They copy the real cards' shapes (a test fails if a card changes size without its placeholder following), say "Loading ..." once to a screen reader, cannot be focused or clicked, show no invented text, and stop pulsing for visitors who ask their device for less motion.
- The boundary is keyed by the filters, so choosing a filter shows the placeholder again instead of leaving the old list in place.
- `/events` shows its side column (Taita Cup, Taita Week) at once: it needs no database.

## Why there is no `loading.tsx` (do not add one without reading this)
A `loading.tsx` wraps everything **beneath** its folder, including pages that can say "not found" (`/events/[slug]`, `/stories/[slug]`). Once a page has started streaming, the server has already sent "200 OK", so a missing page would no longer return a real 404. A test fails if a `loading.tsx` appears. The boundary lives inside the five list pages instead, none of which uses `notFound` or `redirect`.

## What is not covered, and why
- **Pages that are cached** (`revalidate`: the shop, the details of stories, stays and experiences, Taita Cup, Taita Week...) are already served from cache and need no placeholder.
- **Detail pages** keep real 404s (see above). **Account and admin pages** redirect when someone is signed out, which a placeholder would delay; the admin can have one after the admin redesign is merged (its colours are only defined there).
- `/search` is not covered yet.

## Testing
`tests/loading_states_test.tsx` streams each page with a database that will not answer, and checks the heading and placeholder arrive first and the results after. Other tests that check a page's *content* use `tests/resolve_async.tsx`, which fills in the waiting part first.
