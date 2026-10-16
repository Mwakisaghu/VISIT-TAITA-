# The Taita Passport

`/passport` is a booklet: a cover, a page about you, pages of stamps, a page of endorsements, a page of rewards. On a wide screen the pages turn two at a time (a spread); on a phone, one at a time.

## What is on each page
- **Cover:** opens the booklet. The server sends only the closed cover (the same size and place the booklet's cover will have), so nothing jumps when the browser takes over. Without JavaScript the whole passport is a plain list inside `<noscript>`.
- **You:** your name, the day your passport was issued (a real "Karibu" stamp: you did join), your stamps placed on Taita's altitude line (the Field Guide's 400 to 2,300 m scale), and three numbers: stamps, self-marked, points.
- **Stamp pages:** one set of pages per altitude zone, six places to a page, in the order you climb them. Each zone has its own ink: Plains rust, Foothills green, Highlands indigo (the way the US National Parks passport gives each region its own ink). A place with no recorded height is never guessed into a zone; it goes on an "Elsewhere in Taita" page. A zone with no places has no page.
  - **Stamped** (QR or location): full ink with the date, in Nairobi time.
  - **Marked as visited** ("I've been here"): a lighter dashed stamp, no date, no points.
  - **Not yet visited:** a faint outline.
- **Endorsements:** the seals people earn, drawn (never emoji, which each phone draws differently). Earned: filled, with the day it was earned. Not yet earned: hollow, with what it takes; a progress ring appears **only** for the two endorsements that can really be counted (Insider = visits in three different kinds of place, Legend = every published place). The requirement text is the endorsement's description from the database.
- **Rewards:** points, a link to spend them, your "Want to go" list (the account page's "Want to go" card links to `/passport#want-to-go` and the booklet opens there), and how points work.

## Checking in
Tapping a place opens a sheet with **one** main action: "Stamp my passport" (uses the phone's location once, only to check you are close, never stored) or, for a place with only a QR plaque, a line saying to scan it. "Just mark as visited (no points)" is a quiet second choice; a marked place offers "Remove my mark". The check-in action (`checkInWithLocation`) returns a **code** as well as its English text, so every failure is said in the person's own language.

## Where things live
- `lib/passport-book.ts`: the rules (zones, stamp states, pagination, sheets and spreads, dates and heights in each language). Pure.
- `lib/passport-data.ts`: reads everything for ONE person (every query scoped to them).
- `lib/passport-constants.ts`: values the browser also needs. **Do not import `lib/passport.ts` from a component**: it makes the QR tokens with `node:crypto`, and the browser build fails. A test follows every import of the booklet to catch this.
- `components/passport/book/`: `PassportBook` (the booklet), `PassportPages` (each page), `PlaceSheet` (the check-in sheet), `Art` (the drawn stamps and seals), `passport.css` (every class starts with `pp-`; base rules use `:where()` so they can never outrank a component's class).
- `app/passport/page.tsx`: signs the person in, loads their data, renders the booklet.

## Motion and accessibility
- The page-turn follows the phone's reduce-motion setting and has its own on-page switch (kept only for the visit: nothing is stored in the browser). **Plain view** drops the booklet and lists every page in order.
- Only transforms and fades are used, so it stays smooth on a basic phone. The rough-ink edge on stamps is drawn once and never animated: if a very cheap phone struggles, remove the `filter` on stamps in `Art.tsx`.
- Pages that are not showing are `inert` (unreachable by keyboard and hidden from screen readers). Arrow keys turn pages from anywhere on the page. The sheet is a native modal `<dialog>`: focus is trapped, Escape closes it, and focus returns to the place that was tapped.

## Adding an endorsement
Add its drawing to `SEAL_GLYPH` in `Art.tsx` under the lower-case key (`TAITA_WILD` uses `wild`). Any endorsement without a drawing gets a star.

## Language
English, Kiswahili, Français and Deutsch. The translations were drafted for Visit Taita and **must be read by a native speaker before launch**. Endorsement names and requirement text come from the database and are in English until translated there. The one-line descriptions of the zones ("Where Taita begins: ...") are editorial: please read and correct them.
