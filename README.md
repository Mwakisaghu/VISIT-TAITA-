# Visit Taita — Phase 1 + 2 + 3

**More than a place.**

A Next.js (App Router) build of Visit Taita. Phase 1 covers the public
site (homepage, Discover, Stories, Events). Phase 2 adds a real database,
authentication, the Taita Passport (badges/points), and an admin CMS for
managing Destinations, Stories and Events. Phase 3 adds the Taita Cup
sports portal (teams, fixtures, standings), the Taita Made marketplace
with real M-Pesa and card payments, a partner application workflow with
a self-service seller dashboard, and an interactive map.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** with the Visit Taita design-token palette (see below)
- **PostgreSQL** + **Prisma** for data
- **NextAuth** (credentials/email+password, JWT sessions) for auth
- **Leaflet** + OpenStreetMap for the interactive map
- **M-Pesa (Daraja API)** and **Pesapal** for payments
- **Fraunces** + **Manrope** via `next/font/google`

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up the database.** Copy `.env.example` to `.env` and point
   `DATABASE_URL` at a PostgreSQL database (local, Docker, or a hosted
   instance like Neon/Supabase/Railway). Generate `NEXTAUTH_SECRET` with
   `openssl rand -base64 32`.

   ```bash
   cp .env.example .env
   ```

3. **Run migrations and seed sample data**

   ```bash
   npx prisma migrate dev --name init
   npm run db:seed
   ```

   The seed script creates:
   - 6 sample destinations, 3 sample stories, 3 sample events (all marked `isDemo: true`, same content as Phase 1)
   - 8 Passport badges
   - 2 venues, 4 fictional Taita Cup clubs with rosters, and 8 fixtures (4 played, 4 upcoming) — see the Phase 3 section below
   - 6 sample Taita Made products across categories, all in stock
   - 3 sample partner applications (one pre-approved) — see the Partner Portal section below
   - 2 festival venues and 7 Taita Week sessions spanning 3 days — see the Taita Week section below
   - All 6 sample destinations get approximate real-world coordinates, so `/map` isn't empty on first run
   - A demo admin account: `admin@visittaita.example` / `ChangeMe123!` — **change this password before deploying anywhere shared.**

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000. First run needs internet access to fetch
   the Google Fonts (Fraunces, Manrope).

```bash
npm run build       # production build
npm run start       # serve the production build
npx prisma studio   # browse/edit the database visually
```

## What's new in Phase 2

### Database (`prisma/schema.prisma`)
Users (with roles), Destinations, Stories, Events, Badges, UserBadges,
Visits, and Newsletter subscribers — all with audit timestamps. All
public pages (homepage, Discover, Stories, Events, sitemap) now read
live from Postgres via Prisma instead of the static file Phase 1 used.

### Authentication
Email/password auth via NextAuth (`lib/auth.ts`), JWT sessions carrying
`id` and `role`. `/register` creates a `MEMBER` account and signs the
user in; `/login` signs an existing user in. There's a single sign-in
flow for everyone (admins, sellers, and ordinary visitors all use the
same `/login` form and the same session) — after signing in, `/login`
checks the session role and sends the person somewhere useful:
admin-level roles land on `/admin`, `SELLER` lands on `/partner`,
everyone else lands on `/passport`. The nav bar similarly shows
Sign in/out, a Passport link for any signed-in user, a Partner link for
`SELLER`, and an Admin link for admin-level roles.

Roles (`prisma/schema.prisma`, brief section 28): `SUPER_ADMIN`,
`ADMIN`, `EDITOR`, `CONTENT_MANAGER`, `PARTNER`, `SELLER`,
`EVENT_MANAGER`, `CREATOR`, `MEMBER`, `VISITOR`. Only the first four
can reach `/admin` (enforced in `middleware.ts`). `SELLER` gets its own
`/partner` dashboard (see the Partner Portal section below); `PARTNER`,
`EVENT_MANAGER` and `CREATOR` remain scaffolded in the schema with no
dedicated UI yet.

### Taita Passport (`/passport`)
Signed-in users can mark destinations as visited. `lib/actions/passport.ts`
awards badges automatically:
- **Taita Explorer** — first visit of any kind
- **Taita Wild / Culture / Trails / Taste / Sport** — first visit in that category
- **Taita Insider** — visited destinations in 3+ categories
- **Taita Legend** — visited every published destination

Points are 10 per visit, recalculated whenever a visit is toggled.

### Admin CMS (`/admin`)
Protected by `middleware.ts` (admin-level roles only). Overview page
with content counts, plus full create/edit/delete for Destinations,
Stories and Events via Server Actions (`lib/actions/admin.ts`) with
`zod` validation. New content is marked `isDemo: false` automatically,
so real content added through the CMS is distinguishable from the
seeded sample data.

### Newsletter
The homepage signup form now posts to `/api/newsletter` and persists
subscribers for real (`NewsletterSubscriber` model), instead of the
Phase 1 placeholder that only prevented the default submit.

## What's new in Phase 3 — Taita Cup

A self-contained sports portal for the Taita Cup football tournament.

### Public pages
- **`/events/taita-cup`** — standings table, upcoming fixtures, recent
  results, and a teams sidebar, under the "Come for the football. Stay
  for Taita." banner
- **`/events/taita-cup/teams/[slug]`** — a team's roster and full fixture list

Both the homepage and `/events` link through to this section.

### Standings
`lib/cup.ts` computes the table on the fly from `FINISHED` fixtures
(3 points for a win, 1 for a draw, sorted by points → goal difference →
goals for) — there's no separate "standings" table in the database,
so results are always consistent with the fixtures that produced them.

### Admin CMS (`/admin/cup/...`)
Full create/edit/delete for:
- **Teams** — name, town, crest (emoji)
- **Players** — name, position, squad number, assigned to a team
- **Venues** — name, location, capacity, image
- **Fixtures** — home/away team, venue, kickoff, round, status
  (`SCHEDULED` / `LIVE` / `FINISHED` / `POSTPONED` / `CANCELLED`), and
  scores once finished

Server actions live in `lib/actions/cup.ts`, same pattern as
`lib/actions/admin.ts` from Phase 2 (admin-only, `zod`-validated,
`isDemo: false` on anything created through the CMS).

### Data model additions
`SportVenue`, `SportTeam`, `SportPlayer`, `SportFixture` — see
`prisma/schema.prisma`. Fixtures require both a team pairing and a
venue; deleting a venue that has fixtures is blocked (`onDelete:
Restrict`) rather than silently orphaning results.

## What's new in Phase 3 — Taita Made

A working marketplace: browse, cart, checkout with real payments
(M-Pesa or card), and an admin side to manage products and orders.

### Public pages
- **`/shop`** — category filters + product grid
- **`/shop/[category]`** — one category (clothing, art, crafts, food, home, books, photography, collectibles)
- **`/shop/product/[slug]`** — product detail, add to cart or buy now
- **`/shop/cart`** — cart contents, quantity adjust/remove, subtotal
- **`/shop/checkout`** — fulfillment method (shipping/local pickup),
  payment method (M-Pesa or card), phone, address; requires sign-in
- **`/shop/orders/[id]`** — order confirmation with live payment
  status (polls while pending, offers a retry if payment failed),
  visible to the buyer or an admin

The homepage and nav both link through to the shop; the nav shows a
live cart item count.

### Cart
Client-side only (`components/marketplace/CartProvider.tsx`), a React
Context persisted to `localStorage` under the key `taita-made-cart`.
Nothing is written to the database until checkout — so the cart
survives a page refresh but isn't shared across devices.

### Checkout and orders
`lib/actions/marketplace.ts`'s `placeOrder` action re-validates prices
and stock server-side (never trusts the client-sent cart blindly),
creates the `Order` + `OrderItem` rows and decrements inventory in a
single Prisma transaction. It no longer redirects on success — it
returns the new order's id, and the checkout page then hands off to
whichever payment method the buyer picked (see the Payments section
below). Expected failures (out of stock, missing address, unavailable
product) return `{ error }` instead of throwing, so the checkout form
can show the message inline rather than crashing.

### Admin CMS (`/admin/shop/...`)
- **Products** — full create/edit/delete, with price (whole KES),
  SKU, inventory, category, shipping/pickup toggles, featured flag
- **Orders** — list with buyer contact info, itemized contents,
  payment method + status, and an inline order-status dropdown
  (`PENDING` → `CONFIRMED` → `FULFILLED`, or `CANCELLED`) that updates
  immediately without a page reload

### Data model additions
`Product`, `Order`, `OrderItem` — see `prisma/schema.prisma`. Prices
are stored as whole KES integers (no decimals) to avoid float
rounding; `OrderItem.unitPrice` snapshots the price at purchase time
so later price changes don't rewrite order history.

## What's new in Phase 3 — Payments (M-Pesa & Cards)

Real payment collection for Taita Made checkout — M-Pesa via
Safaricom's Daraja API (STK push / "Lipa Na M-Pesa Online"), and cards
via Pesapal's hosted checkout.

**Why Pesapal and not Stripe:** Stripe doesn't support Kenya as an
account/payout country, so a Kenya-domiciled business can't open a
native Stripe account. Pesapal is built for exactly this market —
Kenya-based, supports KES natively, and its hosted checkout accepts
Visa/Mastercard as well as M-Pesa and Airtel Money in one integration.

### How it works
1. Checkout creates the order first (`paymentStatus: UNPAID`), then
   immediately starts a payment attempt for whichever method the buyer
   chose.
2. **M-Pesa (direct)**: `lib/actions/payments.ts`'s
   `initiateMpesaPayment` calls `lib/mpesa.ts`, which authenticates
   with Daraja and triggers an STK push to the buyer's phone. The
   order becomes `PENDING`. Safaricom calls
   `POST /api/payments/mpesa/callback` with the final result — that
   route marks the order `PAID` (saving the M-Pesa receipt number) or
   `FAILED` (and restocks inventory).
3. **Cards (via Pesapal)**: `createPesapalOrder` calls
   `lib/pesapal.ts`, which authenticates, submits the order, and
   returns a `redirect_url` to Pesapal's hosted payment page; the
   buyer is redirected there. Pesapal's flow is two-pronged:
   - It redirects the buyer's browser back to `callback_url`
     (`/shop/orders/[id]`) with an `OrderTrackingId` — but critically,
     **this redirect carries no payment status**, only the tracking id.
   - It separately calls our IPN endpoint
     (`GET /api/payments/pesapal/ipn`) with the same tracking id.

   Both paths call the same `syncPesapalOrderStatus`, which fetches
   the real status from Pesapal's `GetTransactionStatus` endpoint and
   updates the order (`PAID` + confirmation code, or `FAILED` +
   restock). The confirmation page checks on load so the buyer isn't
   left waiting on the IPN alone; the IPN is the reliable path in case
   the buyer closes their browser before the redirect completes.
4. The order confirmation page (`/shop/orders/[id]`) shows a
   `PaymentStatusPoller` that checks payment status every few seconds
   while `PENDING`, and offers a **Retry payment** button if `FAILED`
   (which re-triggers the same STK push or starts a fresh Pesapal
   order, depending on the method originally chosen).

Both the M-Pesa callback and `syncPesapalOrderStatus` are
**idempotent** — they only act the first time an order transitions out
of `PENDING`, since both Safaricom and Pesapal can and do redeliver the
same callback more than once.

### Setup
See `.env.example` for the full list. You'll need:
- **`NEXT_PUBLIC_APP_URL`** — a real, internet-reachable HTTPS URL.
  Neither Safaricom nor Pesapal can call back to `localhost`; for local
  development, run a tunnel (ngrok or similar) and point this at the
  tunnel's HTTPS URL.
- **M-Pesa**: a [Safaricom Developer](https://developer.safaricom.co.ke)
  account, an app under Daraja for the "Lipa Na M-Pesa Online" (STK
  push) product, and the sandbox shortcode/passkey it gives you.
  `MPESA_CALLBACK_URL` should be `${NEXT_PUBLIC_APP_URL}/api/payments/mpesa/callback`.
- **Pesapal**: a [Pesapal Developer](https://developer.pesapal.com)
  account (sandbox credentials are free and instant), then a one-time
  IPN registration:
  ```bash
  npm run pesapal:register-ipn
  ```
  This registers `${NEXT_PUBLIC_APP_URL}/api/payments/pesapal/ipn` with
  Pesapal and prints an `ipn_id` — paste that into `PESAPAL_IPN_ID` in
  your `.env`. **Re-run this any time `NEXT_PUBLIC_APP_URL` changes**
  (e.g. a new ngrok tunnel, or moving from staging to production) —
  each URL gets its own `ipn_id`.

### Data model additions
On `Order`: `paymentMethod` (`NONE` / `MPESA` / `CARD`),
`paymentStatus` (`UNPAID` / `PENDING` / `PAID` / `FAILED`), `paidAt`,
plus provider-specific fields (`mpesaCheckoutRequestId`,
`mpesaMerchantRequestId`, `mpesaReceiptNumber`,
`pesapalOrderTrackingId`, `pesapalMerchantReference`,
`pesapalConfirmationCode`).

## What's new in Phase 3 — Partner Portal

A public application workflow for businesses that want to work with
Visit Taita, plus a self-service dashboard for approved sellers.

### Public pages
- **`/partners`** — what partnering looks like, the partner types on
  offer, and a directory of approved partners (business name, type,
  their own description, website link — no contact details shown
  publicly)
- **`/partners/apply`** — the application form, plus a "check your
  application status" lookup by email on the same page (no login
  needed — applicants aren't necessarily registered users yet)

### Admin review (`/admin/partners`)
- List of applications with status badges, newest first
- Detail page per application with the full message, status buttons
  (`PENDING` / `APPROVED` / `REJECTED`, applied instantly via a small
  client component — no page reload), and admin-only notes
- **Grant seller access** — for `SELLER`-type applications only. Looks
  up a Visit Taita account by the applicant's email and promotes it to
  the `SELLER` role. This does not create an account or send an invite
  — the applicant has to have registered first (see Not yet
  implemented). Never downgrades an existing admin-level account.

### Partner dashboard (`/partner`)
Gated by role in `app/partner/layout.tsx` (signed-in `SELLER` or
admin-level roles only — everyone else sees a friendly "apply to
partner" prompt instead of a login wall). Sellers get a scoped view of
the same Taita Made product tools from Phase 3, but locked to their own
listings:
- Dashboard summary — total / live / awaiting-review listing counts
- Full create/edit/delete for their own products
  (`lib/actions/seller.ts`) — ownership is checked both in the page
  (so a seller can't even open another seller's edit form) and in the
  server action itself
- New listings always save as `DRAFT` — an admin reviews and approves
  them from `/admin/shop/products`, which shows a dedicated "Pending
  partner review" section (drafts submitted by a `SELLER`-role user,
  separated from ordinary admin-managed drafts) with a one-click
  **Publish** button (`publishProduct` in `lib/actions/marketplace.ts`)
  — no need to open the full edit form just to approve something.
  Once published, a listing appears in `/shop/[category]` under
  whichever category the partner chose. The admin overview page also
  shows a live "Pending listing reviews" count.

### Data model additions
`PartnerApplication` — see `prisma/schema.prisma`. `partnerType` covers
the eight categories from the original brief (accommodation, experience,
food, transport, creator, marketplace seller, event, sponsor); only
`SELLER` has a working "grant access" path today, since that's the only
partner type with a dashboard built so far.

## What's new in Phase 3 — Interactive Map

**`/map`** — every published destination with coordinates, plotted on
an OpenStreetMap-tiled Leaflet map, filterable by the same six Discover
categories (toggle buttons above the map). Tap a pin for a photo,
category, name, region, and a link through to its Discover page.

No API key needed — this uses Leaflet + OpenStreetMap tiles rather than
Mapbox or Google Maps, both of which require a billing-linked API key.
Fine for this scale; if traffic grows, OSM's tile usage policy expects
either self-hosted tiles or a paid tile provider (see
[operations.osmfoundation.org/policies/tiles](https://operations.osmfoundation.org/policies/tiles/)).

### Implementation note
Leaflet touches `window`/`document` at import time, so it can't run
server-side. `app/map/page.tsx` stays a Server Component (it's the one
fetching destinations from Postgres) and renders
`components/map/MapLoader.tsx` — a tiny Client Component whose only job
is the `next/dynamic(..., { ssr: false })` import of
`components/map/DestinationMap.tsx`. Next.js's App Router doesn't allow
`ssr: false` inside a Server Component directly, so this split is
required, not just tidiness.

### Data model additions
Optional `latitude`/`longitude` (`Float?`) on `Destination` — see
`prisma/schema.prisma`. Only destinations with both set show up on the
map; everything else still works exactly as before. Admins set these
from the destination edit form in `/admin/destinations`. The seeded
sample destinations have approximate real-world coordinates for their
real place names, same caveat as their descriptions: illustrative, not
verified.

## What's new in Phase 3 — Taita Week

The festival programme — a day-by-day schedule across venues, ticket
status per session, and an admin side to manage both.

### Public page
**`/events/taita-week`** — a single page: festival intro, then the
full programme grouped by calendar day (derived from each session's
`startsAt`, not a separate day field), with a venues list alongside.
Each session shows its category, time range, venue, and ticket
status (`Free` / `Ticketed` with a KES price / `Sold out`). Linked
from `/events` ("Full Taita Week programme →").

### Admin CMS (`/admin/week/...`)
- **Venues** (`/admin/week/venues`) — name, location, image
- **Programme** (`/admin/week/sessions`) — title, category (music,
  food, culture, sport, family, market, talks), description, venue,
  start/end time, ticket status and price, featured flag. The "new
  session" form requires at least one venue to exist first, same
  pattern as Taita Cup requiring teams+venues before fixtures.

### Data model additions
`FestivalVenue`, `FestivalSession` — see `prisma/schema.prisma`. A
session's day is computed by grouping on the date portion of
`startsAt` rather than stored as a separate field, so there's no way
for a session's displayed day and its actual start time to drift out
of sync with each other.

## Performance

A deliberate pass over the existing pages, not a new feature.

### Images
Every `<img>` tag became `next/image`, with one exception (see below).
The Hero image uses `priority` (it's the largest above-the-fold
element — Next.js otherwise lazy-loads images, which would hurt LCP
for exactly the image that matters most for it) and stays fully
optimized (WebP/AVIF conversion, responsive `srcset`) since it comes
from `images.unsplash.com`, already allowlisted in `next.config.js`.

Every other image — destinations, stories, products — uses
`unoptimized`. This is deliberate, not an oversight: those images come
from arbitrary URLs admins paste into a form (`z.string().url()`, no
domain restriction), and Next's built-in optimizer requires a fixed,
allowlisted source domain to work at all — pointing `next/image` at an
unlisted domain throws at runtime. `unoptimized` still gets automatic
`sizes`-based responsive rendering, native lazy-loading, and explicit
dimensions that prevent layout shift; it just skips the resize/format
conversion step, which matters less here anyway since the seeded
Unsplash URLs already request a specific size via their own `?w=`
query param. If Visit Taita later moves to a real upload pipeline
(S3/Cloudinary/etc. — see "no image upload" below) instead of
free-form URLs, switching these back to fully optimized is a one-line
change per component.

**One deliberate non-conversion**: the small thumbnail inside the map
popup (`components/map/DestinationMap.tsx`) stays a plain `<img>`,
with a comment explaining why — it renders inside a Leaflet-managed
popup container whose size Leaflet computes itself, not a context
where `next/image`'s `fill` layout has a trustworthy sized parent to
work with. Not worth the risk of breaking map popups for a small
thumbnail.

### Caching (ISR)
`export const revalidate = <seconds>` was added to every public,
non-personalized page (homepage, Discover, Stories, Events, Taita Cup,
the Map, the Partners directory) — these don't call `getServerSession`
or read cookies, so Next.js can safely cache the rendered page and
serve it instantly to the next visitor instead of hitting Postgres on
every request, refreshing in the background every 60-120 seconds.
Pages that read the session (`/passport`, `/partner/*`, `/admin/*`,
order confirmation) are correctly excluded — Next.js forces those
fully dynamic regardless, since a cookie-dependent response can't be
safely shared across different signed-in users.

Shop pages (`/shop`, `/shop/[category]`, product detail) use a
shorter 30-second window rather than 60-120, since displayed inventory
counts matter more there — though this only affects how fresh the
*displayed* number looks. Actual stock is always re-validated
server-side at checkout (`placeOrder` in `lib/actions/marketplace.ts`)
regardless of what the page happened to cache, so a stale number here
is a minor UX nit, not an order-correctness risk.

### What I deliberately did NOT do
Considered and rejected: adding a blanket `take` limit to every
unbounded `findMany()` query as a blind "safety net." Two problems
with that: first, `lib/cup.ts`'s standings calculation genuinely needs
every team and every finished fixture to compute a correct table — a
`take` limit there wouldn't optimize anything, it would silently
produce a *wrong* standings table. Second, every list/grid page
(admin lists, the shop grid, the stories index) has no pagination UI
yet — capping a query with no way to reach what's past the cap doesn't
improve performance, it just makes data permanently unreachable
through the UI, which is worse than the current behavior at today's
scale (dozens of rows, not thousands). The honest fix is pagination,
not a silent cap; that's flagged below as a real deferred item rather
than quietly worked around.

## A note on this build environment

This project was built and code-reviewed in a sandbox without network
access to `binaries.prisma.sh`, so `npx prisma generate` couldn't
download the query engine here — meaning the Phase 2 code could not be
fully `next build`-verified end-to-end the way the Phase 1 scaffold
was. The code follows standard, well-documented Prisma/NextAuth/Next.js
App Router patterns throughout (schema relations, compound unique keys
matching `@@unique` field order, server actions, `getServerSession`),
and was reviewed carefully, but **run `npx prisma generate && npm run
build` yourself after `npm install`** as a first step to catch anything
sandbox verification could have missed.

## Content

Everything seeded is placeholder for layout/design review. Content
added through the admin CMS is real by default (`isDemo: false`); only
the seeded rows carry the "sample content" notice on public pages.
Place names in the seed (Ngangao Forest, Lake Chala, Wundanyi, Sagalla
Hill, Taita Hills Wildlife Sanctuary) are real, public geography —
descriptions, reading times and event dates are not verified.

## Design tokens

| Token | Hex | Use |
|---|---|---|
| Stone | `#1B1815` | Primary dark background, body text on light |
| Parchment | `#ECE3CD` | Primary light background |
| Rust | `#A6431E` | Primary accent — CTAs, category labels |
| Canopy | `#2B4736` | Secondary dark accent — Cup/Passport sections |
| Ochre | `#C99A3E` | Tertiary accent — hover states, badges |

Fraunces carries headline personality (editorial, warm serif); Manrope
handles body copy and UI.

## Roadmap

**Not started:** experience/accommodation bookings, sponsorship
management, mobile app, match reports/photos/video, ticketing and
hospitality packages for Taita Cup.

## Not yet implemented

- No image upload — image fields are URLs (paste an image link).
- No pagination — every list/grid page (admin lists, `/shop`, `/stories`) returns its full table. Fine at today's scale; see the Performance section above for why a blind query `take` limit isn't the right fix once this needs addressing.
- No password reset / email verification flow.
- No rich-text editor for story bodies — plain textarea.
- No OAuth providers configured (Google/etc.) — credentials only for now, but NextAuth makes adding one straightforward.
- No rate limiting on auth/newsletter/partner-application endpoints yet.
- Taita Cup: no ticketing, no match reports, no live score updates (status/scores are set manually in the admin), no multi-season/tournament history — the schema assumes a single ongoing competition.
- Taita Made: no shipping cost calculation; no buyer-facing order history page (only the single order confirmation link); inventory is decremented at order creation rather than on confirmed payment, so an abandoned/failed payment restocks correctly (handled) but a customer can in principle tie up stock for the minute or two a payment is pending.
- Partner portal: no email notifications (applicants don't get an email when approved/rejected — they have to check `/partners/apply` themselves); no invite flow (an applicant must already have a Visit Taita account before "grant seller access" can promote them); only the `SELLER` partner type has a working dashboard — `ACCOMMODATION`, `EXPERIENCE`, `FOOD`, `TRANSPORT`, `CREATOR`, `EVENT` and `SPONSOR` applications can be reviewed and approved, but there's no dedicated tooling for them yet, since Visit Taita doesn't have accommodation/experience/event listing features built at all (those are still on the roadmap).
- Map: only Destinations are mapped — Taita Cup venues, Taita Made sellers, and partner businesses don't have pins yet, even though some of those models could reasonably get coordinates later; no clustering (fine at today's scale, would matter once destinations number in the hundreds); no route/directions.
- Taita Week: `ticketUrl` is just an external link field (e.g. to a third-party ticketing site) — there's no in-platform ticket purchase flow, so `Ticketed` sessions aren't connected to the Pesapal/M-Pesa payment work at all yet. No individual session or venue detail pages — everything lives on the one `/events/taita-week` programme page.
- Payments: no refunds (would need a separate admin-triggered flow calling Safaricom's reversal API or Pesapal's refund API — neither is built); no partial payments or M-Pesa Till/Buy Goods flow (only Paybill-style STK push); Pesapal-hosted checkout sessions have their own expiry with no explicit reminder to the buyer.

## What's new in Phase 3 — Stay & Experiences

Enquiry-based listings for places to stay and things to do. Deliberately
not a live booking/payment engine: visitors browse, send an enquiry, and
the host follows up (or the visitor uses the listing's external booking
link when one is set). Availability calendars and reviews are deferred.

### Public pages
- `/stay` — accommodation index with type filters; `/stay/[type]` (hotel, lodge, guesthouse, homestay, campsite); `/stay/listing/[slug]` detail page.
- `/experiences` — experience index with category filters; `/experiences/[category]` (wildlife, culture, adventure, food, wellness); `/experiences/listing/[slug]` detail page.
- Detail pages carry a sticky enquiry card: dates/guests (stay) or preferred date/party size (experience), plus direct phone/email/external-booking links when provided. No account needed to enquire.
- Linked from the nav and included in `sitemap.ts`.

### Admin CMS
- `/admin/accommodations` and `/admin/experiences` — create, edit, delete, with a "Pending partner review" queue and one-click Publish for partner-submitted drafts.
- `/admin/accommodations/enquiries` and `/admin/experiences/enquiries` — enquiry inboxes with status `NEW → CONTACTED → CONFIRMED / DECLINED`.

### Partner dashboard (`/partner`)
- Approving an `ACCOMMODATION` or `EXPERIENCE` application in `/admin/partners` offers **Grant partner access**, which sets the applicant's existing account to the `PARTNER` role (same rules as seller access: the account must already exist, admins are never downgraded).
- `PARTNER` users manage their own listings at `/partner/accommodations` and `/partner/experiences`. New listings always save as `DRAFT`; an admin publishes them. Ownership is enforced server-side.
- Sellers keep `/partner/products`; the sidebar and dashboard stats adapt to the signed-in role.

### Data model additions
`Accommodation`, `Experience`, `AccommodationEnquiry`, `ExperienceEnquiry`, and the `AccommodationType`, `ExperienceCategory` and `EnquiryStatus` enums. Run `npx prisma migrate dev` and `npm run db:seed` (4 sample stays and 4 sample experiences, flagged `isDemo`).

## What's new in Phase 3 — Sponsorship hub

Sponsorship is the largest revenue line in the founding brief, so it gets its own module: a public
pitch page, a lead pipeline, and logo placement on the pages sponsors care about.

### Public pages
- `/sponsors` — what a partnership is built on, current partners, the rate-card packages as
  **indicative** "from" figures (the brief calls them negotiation anchors, not fixed prices), and an
  enquiry form. Package cards deep-link to the form with that package preselected
  (`/sponsors?package=<slug>#enquire`).
- Sponsor logo strips on Taita Cup, Taita Week and the homepage. Each strip renders only when at
  least one **published** sponsor is assigned to it, so nothing appears until a real partner is added.
- Linked from the footer and included in `sitemap.ts`.

### Lead form protections
Honeypot field; 5 submissions per IP per 10 minutes (best-effort, in-memory — resets on restart and
isn't shared across instances); 3 per email per hour (database-backed); website must be http(s);
the chosen package must exist and be published.

### Admin CMS (`/admin/sponsors/...`)
- `/admin/sponsors` — add/edit/delete confirmed sponsors: logo, website, package, which programme
  pages show them (Taita Cup / Week / Sound), homepage toggle, display order, draft/published.
- `/admin/sponsors/packages` — the rate-card packages (price, note, rights, order, status).
- `/admin/sponsors/leads` — lead inbox with a detail page: pipeline status
  (`NEW → CONTACTED → PROPOSAL_SENT → WON / LOST`) and internal notes.

### Data model additions
`SponsorPackage`, `Sponsor`, `SponsorLead` and the `SponsorLeadStatus` enum. `npm run db:seed` loads the
8 packages from the brief's rate card. No sponsors are seeded — only list real, confirmed partners.

### Not built yet
Email notification to the team when a lead arrives; sponsor reporting/analytics.

## What's new — Email notifications

Leads and enquiries now reach a person, not just the admin inbox.

| Event | Emailed |
|---|---|
| Sponsor lead (`/sponsors`) | Team inbox(es) in `NOTIFY_EMAIL`, with a link to the lead in admin |
| Stay / experience enquiry | Team inbox(es), **and** the listing's own contact email |

- Replying to either email goes straight to the person who enquired (`Reply-To` is set to them).
- **Demo listings never email their placeholder contact address** — only the team is told.
- **Submitters are not sent a confirmation email.** That would let anyone use the public forms to send
  mail to a third party's address. The on-page confirmation is shown instead.
- Plain-text only: nothing a visitor types is ever rendered as HTML in an email.
- A mail failure (or no email setup at all) **never blocks a submission** — the lead or enquiry is
  saved first, and the email is best-effort with a 4-second timeout.

### Setup (Resend)
1. Create a free account at https://resend.com and an API key.
2. Add to `.env`: `RESEND_API_KEY`, `EMAIL_FROM`, `NOTIFY_EMAIL` (see `.env.example`).
3. Run `npm run email:test -- you@example.com` to confirm it works.

**Important:** until you verify your own domain in Resend, the shared `onboarding@resend.dev` sender only
delivers to the email address your Resend account was created with — enough for a single team inbox,
not for emailing listing hosts or several people. Verify a domain, then use an address on it for `EMAIL_FROM`.

### Not built yet
Retry/queue for failed sends (a failure is logged, not retried); per-listing-owner notification
preferences; delivery to a Slack/WhatsApp channel.

## What's new — Taita Passport check-ins & rewards

The Passport now rewards being **there**. This supersedes the Phase 2 behaviour where tapping "Mark visited"
earned points.

### How points are earned
- **Verified check-ins only.** Scan the QR plaque at a destination (`/checkin/<token>`) or tap **Check in here**
  on the Passport page when nearby (GPS, within the destination's radius). Either awards **10 points** the first
  time at that place. The amount lives in `lib/passport.ts` (`CHECKIN_POINTS`).
- **"I've been here" still exists but earns no points** (it can still unlock badges). A verified check-in at the
  same place upgrades it. Verified check-ins can't be un-marked.
- **One award per person per destination**, enforced by a database constraint
  (`@@unique([userId, destinationId, reason])`) — un-marking, re-marking, or switching between QR and GPS can't
  pay twice.
- GPS: reported accuracy must be ≤ 200 m, and some GPS error is forgiven (up to 100 m). Per-destination radius
  is 50–5000 m (default 300).

### Points are a ledger
`User.points` is a cached balance that must equal the sum of that user's `PointsEntry` rows (reasons:
`LEGACY`, `CHECKIN`, `REDEMPTION`, `REFUND`, `ADJUSTMENT`). To check or repair it:
```bash
npm run points:backfill -- --dry-run   # lists any user whose balance and ledger disagree
npm run points:backfill                # records the difference (LEGACY the first time, ADJUSTMENT after)
```
Safe to re-run. **Run it once when you first deploy this**, before anyone checks in, so existing balances are
carried into the ledger.

### Rewards
- Visitors redeem at `/passport/rewards` and receive a voucher code like `TAITA-K7M2QX`.
- Redemption is **atomic**: points and limited stock are taken with conditional updates in one transaction, so
  simultaneous redemptions can't spend the same points or the last unit of stock.
- **No rewards are seeded.** Add one in `/admin/rewards` only after a partner has agreed to honour it.

### Admin
- `/admin/destinations` — each destination has a check-in radius and a QR code. New destinations get a code
  automatically; **Generate missing codes** fills in existing ones (never changes a code that exists).
- `/admin/destinations/<id>/qr` — a print-ready plaque. It refuses to draw a printable code while
  `NEXT_PUBLIC_APP_URL` is localhost or a private address. **Replace the code** invalidates every printed plaque
  for that destination (use it if a code leaks, then reprint).
- `/admin/rewards` — reward CMS (cost, partner, instructions, stock — blank = unlimited — end date, image).
  A redeemed reward can only be set to Draft, not deleted.
- `/admin/rewards/redemptions` — find a voucher by code, **Mark used**, or **Cancel & refund** (returns the
  points and restores stock, exactly once).
- Sign-in and registration honour a same-site `?next=` path, so a QR scan survives signing in.

### Launch checklist
1. `npx prisma migrate dev` (or `migrate deploy` in production), then deploy.
2. `npm run points:backfill`.
3. Set `NEXT_PUBLIC_APP_URL` to your real public address in production.
4. `/admin/destinations` → **Generate missing codes**; publish the destinations that should accept check-ins.
5. Print each plaque from its `/qr` page and **test-scan it with a phone** before mounting it.
6. Add rewards in `/admin/rewards` once partners agree to them.
7. Decide who marks vouchers **Used** when a partner honours one.

### Partner voucher verification
Each reward can be assigned a **partner account** (a user with the Partner or Seller role) in
`/admin/rewards`. That partner signs in, opens **Vouchers** in their dashboard (`/partner/vouchers`), types
the code the visitor shows them, and sees whether it is valid, already used, or cancelled — then taps
**Mark as used**.

- A partner only ever sees vouchers for **their own** rewards. A code that belongs to someone else's reward is
  reported as "not found", exactly like a code that doesn't exist.
- They see the holder's first name and last initial only — no email, no full name.
- Marking used is a single conditional update (ownership + status), so it can't be done twice or by the wrong
  partner. It records **who** did it (`RewardRedemption.usedById`) and when.
- A reward past its end date can't be marked used by a partner (an admin can override).
- **Cancelling and refunding stay admin-only.**
- Rewards with no partner assigned can still only be handled by staff in `/admin/rewards/redemptions`.
- **Email:** when a visitor redeems a reward, the assigned partner is emailed the code, the reward and the holder's
  first name + initial; a staff-run reward emails the team inbox instead. It needs the email setup above, and a
  mail failure never blocks a redemption.
- **Who can be a voucher partner:** accommodation, experience, **food and transport** applications can all be
  granted partner access in `/admin/partners`; marketplace sellers get seller access.

### Limits worth knowing
- GPS coordinates come from the visitor's browser and can be faked by a determined person — it's friction, not
  proof. The QR plaque is the stronger signal; rotate a code if it leaks.
- Check-in and redemption rate limits are in-memory (best-effort; they reset on restart and aren't shared across
  server instances). Double-awards and double-spends are prevented by the database, not by these limits.
- Vouchers are marked used by the reward's own partner at `/partner/vouchers` (or by an admin).

### Data model additions
`Visit.method`, `Destination.checkinToken` / `checkinRadiusM`, `PointsEntry`, `Reward`, `RewardRedemption`
and the `VisitMethod`, `PointsReason`, `RedemptionStatus` enums.

### Not built yet
Emailing the team when a voucher is redeemed; streaks/leaderboards;
check-in photos.

## What's new — Reviews

Visitors can review **stays and experiences**. Reviews are moderated, and the review text a visitor writes is
only ever shown as plain text.

### How it works
- Any signed-in visitor can write one review per listing (a database constraint enforces it) — a 1–5 star rating,
  an optional headline, and 20–2,000 characters of text. They can edit or delete it later.
- **Every review is PENDING until an admin approves it**, and **an edit sends it back to PENDING** so an approved
  review can't be swapped for something else. A rejection can carry a short reason the author sees.
- **"Verified guest"**: shown when the author had an enquiry for that listing that staff marked **CONFIRMED** in
  the enquiry inbox. It's a snapshot taken when they wrote the review.
- Listing owners can't review their own listing. Reviews are limited to 5 submissions per hour per person.
- Authors are shown as first name + last initial (e.g. "Jane D."); their email is never shown publicly.
- The public list and rating summary render inside the **cached** listing page; the signed-in visitor's own form
  loads on the client, so the page keeps its ISR caching.
- **Ratings on cards:** stay and experience cards show **★ 4.6 (12)** once a listing has an approved review. A page
  of cards costs one grouped query, not one per card.
- **Search engines:** a listing page with at least one approved review also emits `aggregateRating` structured
  data (JSON-LD; a stay is a `LodgingBusiness`, an experience a `Product`). Only approved reviews count, nothing
  is emitted for a listing with none, and the `url` is omitted unless `NEXT_PUBLIC_APP_URL` is a real public
  address. Whether Google shows star snippets is Google's decision — this makes the pages eligible, not guaranteed.

### Admin
`/admin/reviews` — a moderation queue (Pending by default; Approved / Rejected tabs), with **Approve**,
**Reject** (optional reason) and **Delete**. The overview shows how many are waiting, and the team inbox
(`NOTIFY_EMAIL`) is emailed when one is submitted or edited.

### Data model additions
`Review` and the `ReviewStatus` enum.

### Not built yet
Replies from the listing owner; reviews of destinations; "helpful" votes; sorting/filtering listings by rating.

## What's new — Taita Field Crew (creators)

The creator programme from the founding brief ("recruit the first creator cohort", 20+ creators or
contributors). Phase 1 is applications, approval, public profiles and story bylines. The design is built around
what the research on tourism creator programmes says works: evidence over adjectives, trust, and clear
disclosure — and around something only Visit Taita has, **verified presence** from the Passport check-ins.

### The plan
1. **Phase 1 (this release):** apply → staff approve → public profile + directory → story bylines.
2. **Phase 2:** *Missions* — briefs tied to a real place and campaign (optionally sponsor-backed), with the
   evidence each note should include.
3. **Phase 3:** *Field Notes* — structured reports a creator can file only after a **verified check-in** at the
   place, published with a "Verified on location" badge, and labelled "Presented by …" automatically when a
   mission is hosted or sponsored.
4. **Phase 4:** impact tracking and sponsor reporting.

### Phase 1
- **Two tracks:** *Local Voice* (community storytellers — no audience size or portfolio required) and
  *Visiting Creator* (a portfolio link is required).
- `/creators/apply` — requires sign-in. Collects a public name, bio, what they create, up to 5 links, a pitch,
  and agreement to the creator guidelines (the version is stored with the application). An optional
  self-reported audience note is **admin-only and never shown publicly** — it can't be verified. One pending
  application per person; rejected applicants can reapply.
- `/admin/creators` — Pending / Approved / Rejected tabs plus **Field Crew** (pause or resume). **Approve** creates
  the profile and grants the CREATOR role in one transaction; **Reject** takes an optional reason the applicant
  sees. The applicant is emailed the decision at their account address, and the team inbox is emailed on each
  new application.
- Approval only changes the role of a plain account (member/visitor). A partner, seller or staff member keeps their
  existing role (an account has one role) and still gets a Creator profile.
- `/creators` (directory) and `/creators/<slug>` (profile with their published stories). Paused creators disappear.
- Stories credit their author as **By <name>** only when the author is an *active* creator, so a staff account name
  is never exposed.

### Roles now refresh
A user's role used to be read once at sign-in and trusted for the token's life (30 days by default), so a
promotion didn't apply until the next sign-in and **a demoted admin or editor kept their access**. The role is now
re-read from the database at most every 5 minutes, and the admin layout checks it on every render.

### Guidelines
The guidelines shown on the application form are a plain-language **draft**. Have your lawyer review them
(disclosure wording and the content licence in particular) before launch; bump `CREATOR_TERMS_VERSION` in
`lib/creators.ts` when you change them.

### Data model additions
`CreatorApplication`, `Creator`, and the `CreatorTrack`, `CreatorSpecialty`, `CreatorApplicationStatus`, `CreatorStatus` enums.

### Not built yet
(Impact and sponsor reporting is in the next section.)

## What's new — Field Crew missions

Phase 2 of the Field Crew: **missions** — briefs for creators, each tied to a real place.

- **Missions** (`/admin/missions`): title, summary, brief, optional campaign and image, a **destination**, who it's
  open to (both tracks, or one), up to 8 **evidence prompts** ("what it costs", "how long it takes", "one honest
  caveat" — evidence, not adjectives), reward points, an optional spot limit and deadline. They are Draft / Open /
  Closed.
- **Opening a mission is checked.** It needs at least one prompt, a deadline not already past, and a destination that is
  **published and can actually be checked in at** (a QR code or coordinates) — because Phase 3's "verified on
  location" needs a place that can be verified. The reason is shown if it can't open.
- **Disclosure is built in.** A mission is *independent*, *hosted* (a partner provides e.g. a stay) or *sponsored* (a
  sponsor from the sponsorship hub funds it). Hosted and sponsored missions must say who and what is provided; that is
  shown publicly ("Presented by …", "Hosted by …") and the **suggested disclosure line** creators paste into their posts
  is generated from it (e.g. "In partnership with Acme Co through Visit Taita. #ad"). It is a suggestion to make
  disclosure the easy default — not legal advice.
- **Public pages:** `/missions` (open missions, plus recently closed) and `/missions/<slug>` — cached, with the visitor's
  own claim state loaded on the client. Drafts are never public.
- **Claiming** (Field Crew members only): a creator claims a spot, and can withdraw. The spot is taken with a
  conditional update inside a transaction, so two creators can't both take the last one; a failed claim gives the spot
  back. Limits: one claim per mission per creator (a withdrawn claim can be re-claimed), **3 active missions at a time**,
  and the mission's track and deadline are enforced. Paused creators can't claim.
- **`/crew`** — a creator's own page: their claimed missions with the prompts and their disclosure line, and the open
  missions available to them. Being a creator is a **profile**, not a role, so a partner or staff member with a
  profile can use it too; the Crew link in the nav shows for the Creator role.
- A mission that has been claimed can only be closed, not deleted.
- Also fixed: the **Partner** nav link now shows for `PARTNER` accounts (it only showed for sellers, so listing and
  voucher partners had no link to their own dashboard).

### Data model additions
`Mission`, `MissionClaim`, and the `MissionStatus`, `MissionSupport`, `MissionClaimStatus` enums.

### Not built yet
(Filing a Field Note, the verified-on-location badge and the reward points are in the next section.)

## What's new — Field Notes (verified on location)

Phase 3 of the Field Crew, and the part that sets it apart: a creator's report on a mission that can only be filed
**after a verified check-in at the place**.

- **The rule.** A creator can file a note only if they have passed a **QR or GPS check-in** at the mission's destination
  **after claiming the mission**. "Marking a place visited" (self-reported) is not proof, and neither is a check-in made
  before claiming — otherwise one old visit could back any note. The check-in's time and method are copied onto the
  note and shown publicly as **"Verified on location"**.
- **Why a new column.** A repeat check-in at an already-verified place used to change nothing, so a creator who had
  verified a place before could never produce a check-in *after* claiming. `Visit.lastVerifiedAt` is now refreshed by
  every successful QR/GPS check-in (points are still awarded once). Check-ins made before this release carry no proof
  timestamp, so a creator simply checks in again.
- **The note.** A title, an answer to each of the mission's evidence prompts (snapshotted, so editing the mission later
  can't scramble old notes), an optional story, photo links (up to 6) and links to their own posts (up to 5) — at least
  one photo or post link, links only since there is no file storage. For a hosted or sponsored mission they must confirm
  they disclosed it, and the disclosure line is stored on the note.
- **Review.** `/admin/field-notes`: **Publish** (completes the creator's claim and awards the mission's points to their
  Passport once — the PENDING→APPROVED move is a conditional update inside a transaction, so two editors can't award
  twice), **Request changes** (a reason is required; the creator edits and resubmits in place), **Hide / Restore** (no
  points taken back or re-awarded). A published or hidden note can't be edited by the creator. The team is emailed on each
  submission; the creator is emailed the decision at their account address.
- **Public.** `/notes` (index) and `/notes/<slug>` (the note, with the verified badge, who hosted or sponsored it, the
  evidence, the photos and links to their posts); notes also appear on the mission page and the creator's profile. Only
  published notes are public.
- **Creators** file from `/crew` → their mission → `/crew/notes/<mission>`, which shows whether they've checked in yet
  and tells them how if not. Completed missions stay on the crew page as "Published ✓".
- `/crew` is disallowed in robots.txt; `/notes` and published notes are in the sitemap.

### Data model additions
`FieldNote`, `FieldNoteStatus`, `Visit.lastVerifiedAt`, and `PointsReason.MISSION`.

### Launch checklist for Field Notes
1. Run the migration, then restart. 2. Print and test-scan the QR plaque for each mission destination (see the
Passport checklist). 3. Make sure a mission's destination is published with a QR code or coordinates (opening a mission
checks this). 4. Have your lawyer review the creator guidelines.

### Not built yet
Replies and reactions on notes. Tracking whether an enquiry became an actual booking or payment (we can see enquiries and whether the HOST marked them confirmed — see the partner inbox).

## What's new — Impact and sponsor reports

Phase 4 of the Field Crew: showing what the programme has produced, and giving sponsors proof of what they paid for —
using only numbers the platform can honestly stand behind.

**What is measured**
- **Hard facts from your database:** missions, claims, published notes, points awarded.
- **Page views** of notes and mission pages. The pages are cached, so views are counted from the browser by a small
  beacon — once per browser session per page. Staff and obvious bots (crawlers, link-preview fetchers, scripts,
  headless browsers, or a missing user-agent) are not counted; a visitor address is limited to 3 counted views per page
  per day; only public items count (a draft or unknown id can't be padded). Only a per-day count is stored — no visitor
  identity. They are an **approximation** and are labelled as one wherever shown.
- **New verified visitors** — people whose *first-ever* QR/GPS check-in at a mission's place fell in a period (the
  Passport records one check-in entry per person per place, so this is accurate), compared for "since the first note was
  published" against an equal-length stretch just before. This is **context, not proof**: other things change visitor
  numbers too.

**What is deliberately not measured:** whether a note caused an enquiry or booking. Notes aren't linked to listings, so
any such number would be invented. The reports say so.

**Where**
- `/admin/impact` — programme totals, a per-mission table (claims, notes, views, new visitors before → after, points) and
  a list of sponsors with a report. Every metric is one batched query across all missions, not one per mission.
- `/admin/impact/sponsors/<id>` — that sponsor's report (print or save as PDF), plus the **shareable link** controls.
- `/report/<token>` — the sponsor's own view of the same report. The link carries an unguessable 96-bit token, shows that
  one sponsor's report only, is never indexed (`noindex`, and `/report` is disallowed in robots.txt) and is never cached.
  **Create / Replace (the old link stops working) / Turn off** from the admin page. Set `NEXT_PUBLIC_APP_URL` to your
  public address first — the admin page warns if it isn't.
- A sponsor's report covers only missions that are *sponsored by them* and have actually run (open or closed). Reports show
  totals only: no emails, no user or creator ids.

### Data model additions
`ContentView` (one row per item per UTC day), `ViewKind`, and `Sponsor.reportToken`.

### Not built yet
Replies and reactions on notes; linking a note to a listing (the prerequisite for any enquiry/booking attribution).

## What's new — Featured listings and enquiry tracking

Closes the gap the impact reports had to admit to: notes weren't connected to anything bookable, so there was no honest
way to say what a mission led to.

- **Feature a stay and/or an experience on a mission** (`/admin/missions` → "Feature a listing"). It must be a real,
  published listing. It appears as **"Plan your own visit"** on the mission page and on every one of the mission's
  published Field Notes (only while the listing stays published).
- **The links carry where the visitor came from** (`?from=mission:<slug>` or `?from=note:<slug>`). The listing pages
  stay cached: the enquiry form reads the link in the browser and sends it with the enquiry.
- **Attribution can't be forged.** An enquiry is credited to a mission or note only when the listing is the one that
  mission **actually features**, the mission is public and the note is published. Anything else is silently ignored — a
  made-up `?from=` on any listing credits nothing. The enquiry itself is always saved and emailed exactly as before; a
  referral never blocks or changes it.
- **The visitor is told.** Under the links: "If you send an enquiry from one of these links, we record that it started
  here, so hosts and sponsors can see what a mission led to. Nothing else about you is shared."
- **Where it shows:** the admin enquiry lists say "Came from the Field Note …" / "the mission …"; `/admin/impact` has an
  "Enquiries (confirmed)" column; the sponsor report shows "Enquiries started" (and how many the host or our team marked
  confirmed) per mission and in total.
- **What it still can't show:** whether an enquiry became a booking or was paid for. "Confirmed" means someone marked the
  enquiry confirmed; the report says so and never claims a note *caused* a booking.

### Data model additions
`Mission.accommodationId` / `experienceId`, and `referredByNoteId` / `referredByMissionId` on both enquiry models (all
optional; deleting a note or mission never deletes an enquiry).

### Not built yet
Replies and reactions on notes; tracking an enquiry through to a paid booking.

## What's new — Legal and trust basics

The pages and controls a platform needs before it collects real people's data.

> **These texts are a plain-language DRAFT written against what the application actually does. They have NOT been reviewed
> by a lawyer, and I am not one.** Kenya's Data Protection Act (2019) is the relevant law; check the specifics — including
> any duty to register with the Office of the Data Protection Commissioner — with your adviser before launch.

- **Pages:** `/privacy`, `/terms`, `/about`, `/contact` (with a contact form), linked from the footer and in the sitemap.
  Nothing about the organisation is guessed: the legal name, contact details and ODPC registration number come from the
  environment variables in `.env.example`, and a missing one shows as **[to be completed]**.
- **The draft notice:** the Privacy Policy and Terms show a visible "Draft — pending legal review" box until you set
  `LEGAL_REVIEWED_ON` (YYYY-MM-DD). It is a deliberate forcing function. Text lives in `lib/legal-text.ts`; when what the
  product collects or shares changes, update it and bump `LEGAL_VERSION` in `lib/site-info.ts`. (Env values are read when
  the page is built, so redeploy after changing them.)
- **Registration** now requires ticking "I'm 18 or over, I agree to the Terms and have read the Privacy Policy". The server
  enforces it, and stores when and which version was accepted (`User.termsAcceptedAt` / `termsVersion`). Existing accounts
  show "Before we recorded this".
- **Plain-language notices** under every form that collects personal data (enquiries, sponsor and partner forms, checkout,
  creator application, newsletter, contact) say what will happen to the details, with a link to the policy. Reviews say they
  show your first name and last initial; the Passport says your location is used once and not stored (it isn't — a check-in
  records only that it happened and when).
- **`/account`** (Account in the nav once signed in):
  - **Download my data** — a JSON file of everything linked to the account: details, Passport, reviews, your enquiries, orders,
    creator profile and notes. It excludes the password (only a hash exists) and the team's internal notes. It only ever
    returns the caller's own data (the id comes from the session) and is rate-limited.
  - **Delete my account** — asks for the password again, then does everything in one transaction: gives back mission spots
    their claims held, cancels unused vouchers and restores limited stock, **anonymises** their enquiries, **keeps shop orders
    as anonymous payment records** (buyer unlinked, phone and address wiped — they may be needed for accounting), removes the
    newsletter subscription, then deletes the account (which removes the Passport, reviews, creator profile and Field Notes).
    Stories they wrote stay without their name. A confirmation email is sent.
  - **It refuses, and says why,** for staff accounts, accounts that manage listings/products/rewards, and accounts with an
    order in progress.
  - **Unsubscribe** from the newsletter (withdraws consent) from the same page.
- **Why orders needed a schema change:** `Order.buyerId` is now optional (`SetNull`). It used to cascade, so deleting a buyer
  would have deleted their payment records.
- **Cookies:** the site sets only the cookies needed to stay signed in, and counts page views without identifying anyone, so
  no cookie banner is used. Say so in the policy (it does) and revisit if you add analytics or advertising.

### Known gaps (not covered here)
- **Accounts aren't email-verified**, so someone can register with an address that isn't theirs. For that reason the data
  export is limited to data linked to the account and never matches on email; requests about unlinked data (an enquiry sent
  while signed out) go through the contact page. Email verification is worth adding.
- There is no automatic deletion of old enquiries yet; the policy says they're kept as long as needed and can be removed on request.
- Corrections to name/email go through the contact page; there is no self-service profile editor.

### Data model additions
`User.termsAcceptedAt`, `User.termsVersion`; `Order.buyerId` is now optional.

## What's new — Partner enquiry inbox

Hosts were emailed every enquiry but could do nothing with it: the dashboard showed only a count, and only your admin team
could set an enquiry's status — the people last to know whether a booking happened. That made "Confirmed" (which sponsor
reports and review verification depend on) unreliable and the "partner lead conversion" KPI unmeasurable.

- **`/partner/enquiries`** (Enquiries in the partner sidebar; the dashboard's "New enquiries" tile links to it): every enquiry
  for the stays and experiences **the signed-in host owns**, newest first, in tabs — New / Contacted / Confirmed / Declined / All
  — with counts. Each shows the guest, their message, dates and party size, and one-tap **Email**, **Call** and **WhatsApp**
  buttons with a polite reply pre-filled. (WhatsApp appears only when the number is clearly valid — Kenyan 07xx/01xx/254… or
  an international number; landlines and ambiguous numbers get no WhatsApp button rather than a wrong link.)
- **Status:** Mark contacted → Confirm or Decline, and back again for mistakes. Confirming says plainly what it means: it
  lets that guest leave a verified review, and counts in sponsor reports.
- **Ownership is enforced in the query, not afterwards.** A host can only ever load or change enquiries for listings they own,
  and "not yours" gives the *identical* message as "doesn't exist", so ids can't be probed. Only what a host needs to reply is
  loaded (no account ids, no referral data).
- **Audit:** every status change records who made it and when (`statusChangedAt` / `statusChangedById`) — including changes
  made by admins — because "confirmed" feeds reports.
- **The host's email now links to the inbox** when the listing has an owner who can sign in.
- Listing partners (role PARTNER) and admins can use it; sellers (shop only) have no listings, so no inbox.

### Known limits
- A host can confirm their own enquiries, which counts in sponsor reports and unlocks that guest's verified review (owners can
  never review their own listing). It is an honour system with an audit trail; if it is ever abused, the trail shows who.
- The guest is not emailed when an enquiry is confirmed or declined (a natural follow-up).
- Enquiries made on demo listings or listings with no owner are only visible to your admin team.

### Data model additions
`statusChangedAt` and `statusChangedById` on `AccommodationEnquiry` and `ExperienceEnquiry`.

## What's new — Newsletter

You were collecting subscribers but could never email them — and the sign-up form added **any address anyone typed, with no
confirmation and no rate limit**. This fixes both, properly.

- **Double opt-in.** Signing up now emails a confirmation link; the person is PENDING until they click it, and only
  **confirmed** subscribers are ever mailed. The form answers identically for a known and an unknown address (so it can't reveal
  who is subscribed), and is rate-limited (10 sign-ups an hour per visitor, 3 confirmation emails an hour per address).
  Unconfirmed sign-ups are deleted after 30 days (by the cron endpoint). The confirm and unsubscribe pages only *show a button* —
  email security scanners open every link in a message and would otherwise confirm or unsubscribe people by accident.
- **Older sign-ups** (from before this) are kept but **not mailed** until they confirm. `/admin/newsletter` shows how many and has an
  "Ask N subscribers to confirm" button (200 at a time).
- **`/admin/newsletter`** (Newsletter in the admin nav): subscriber counts, a plain-text composer (save a draft, **Send me a test**,
  Send), and each newsletter's progress. A footer is added automatically: why they're getting it, **their own** unsubscribe link,
  and who is sending (`SITE_LEGAL_NAME` / `CONTACT_ADDRESS`).
- **Exactly once.** Sending claims the newsletter and creates one outbox email per confirmed subscriber in a single transaction, so
  a double-click, two admins or a retry can't send it twice; if queuing fails it stays a draft. Delivery, retries and progress come
  from the email outbox: the first batch goes immediately, the rest by the cron endpoint (`/api/cron/emails`) or the "Send next
  batch" button.
- **Unsubscribing** works from the link in every email, from the one-click button mail apps show (`List-Unsubscribe` /
  `List-Unsubscribe-Post`, which Gmail and Yahoo expect from bulk senders), and from the account page. It keeps the address as a
  do-not-email record, and **cancels anything already queued** for that person. Deleting an account removes the record.
- **Sending is refused, with the reason, when it would be pointless or harmful:** email not configured; Resend's **test sender**
  (it only delivers to your own address, so every subscriber would bounce); or a non-public `NEXT_PUBLIC_APP_URL` (the unsubscribe
  links would be broken). Test sends to yourself always work.
- The newsletter is **plain text** (no images or layout) — the email layer is plain-text by design. HTML templates are a possible later step.

### Before you send your first real newsletter
1. Verify your domain in Resend and set `EMAIL_FROM` to an address on it.
2. Set `NEXT_PUBLIC_APP_URL` to the real public address, and `SITE_LEGAL_NAME` / `CONTACT_ADDRESS`.
3. Set `CRON_SECRET` and schedule `/api/cron/emails` — otherwise large lists only go out when you press "Send next batch".
4. Use **Send me a test** and open the unsubscribe link from it (a test has no real link — send yourself a real subscription first).

### Data model additions
`NewsletterSubscriber` gains `status` (PENDING / ACTIVE / UNSUBSCRIBED), `token`, `confirmedAt`, `unsubscribedAt`; new
`NewsletterCampaign`; `EmailLog` gains `unsubscribeUrl` and `campaignId`.

## What's new — Account email security

Two gaps shipped with the app: **email addresses were never verified** (anyone could register with someone else's address, which
also locked the real owner out of ever signing up), and **there was no password reset at all** — forget your password and you were
locked out for good. Both are fixed on one token system, plus a few related hardening changes.

- **Email verification.** Registering emails a link; clicking it (a button on the page — opening a link changes nothing, because
  email scanners open every link) verifies the address. Until then a member **can't write reviews or apply to the Field Crew**
  (both are public, or email the account address). Everything else works. The account page shows the status and a "Send me a new
  link" button. **Staff are exempt**, so an unreachable address can never lock an admin out. The check reads the database every time,
  so verifying takes effect immediately.
- **Forgot your password.** `/forgot-password` (linked from sign-in) emails a link that works **once, for an hour**. The answer is the
  same whether or not an account has that address, and it is rate-limited per visitor and per address. Completing a reset also
  verifies the address (it proves they control it), **ends every other sign-in** for that account, cancels any other outstanding
  links, and emails the owner that the password changed. This is also how someone reclaims an address a stranger registered.
- **Links are stored only as a hash**, so a copy of the database can't be used to verify an address or take over an account.
- **Sign-in is harder to attack.** Failed sign-ins are counted per email+address and per address (8 and 40 per 15 minutes); over the
  limit, sign-in is refused even with the right password. A wrong email now takes as long to reject as a wrong password. *The
  counting is held in memory, so on a serverless host each running copy counts separately: it makes guessing much slower but is not
  a hard guarantee — a shared store (Redis/Upstash) would make it exact.*
- **Local development:** if email isn't configured and you're not in production, the verification/reset link is printed in the
  server console so you can still try the flow.
- **Hardening found on the way:** the newsletter sign-up logic took the visitor's IP as an *argument* from a server-action file;
  server actions are public endpoints, so a caller could invent one to dodge the per-visitor limit. It now lives in a plain module
  and the route reads the address from the request.

### What this means for testing
New accounts must verify their email before reviewing or applying to the Field Crew. With email configured the link arrives by
email; in local development it is printed in the terminal running `npm run dev`. Seeded staff accounts are exempt.

### Known limits
- Existing members are unverified until they click a link (there's no bulk "ask everyone" button; they're prompted on their account page).
- Registering with an address that's already taken still says so (you can't hide that on a sign-up form); it now points to "Forgot
  your password?".
- Sessions are ended on the next 5-minute role check after a reset, not instantly.

### Data model additions
`User.emailVerifiedAt`, `User.passwordChangedAt`; new `AccountToken` (hashed, single-use, expiring).
