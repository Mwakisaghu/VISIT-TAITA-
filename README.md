# Visit Taita — Phase 1 + 2 + 3

**More than a place.**

A Next.js (App Router) build of Visit Taita. Phase 1 covers the public
site (homepage, Discover, Stories, Events). Phase 2 adds a real database,
authentication, the Taita Passport (badges/points), and an admin CMS for
managing Destinations, Stories and Events. Phase 3 adds the Taita Cup
sports portal (teams, fixtures, standings), the Taita Made marketplace
(products, cart, checkout, orders), and a partner application workflow
with a self-service seller dashboard.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** with the Visit Taita design-token palette (see below)
- **PostgreSQL** + **Prisma** for data
- **NextAuth** (credentials/email+password, JWT sessions) for auth
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
user in; `/login` signs an existing user in. The nav bar shows
Sign in/out, a Passport link for any signed-in user, and an Admin link
for admin-level roles.

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

A working marketplace: browse, cart, checkout, and an admin side to
manage products and orders. No payment gateway yet — orders are placed
and then confirmed by phone (see Not yet implemented below).

### Public pages
- **`/shop`** — category filters + product grid
- **`/shop/[category]`** — one category (clothing, art, crafts, food, home, books, photography, collectibles)
- **`/shop/product/[slug]`** — product detail, add to cart or buy now
- **`/shop/cart`** — cart contents, quantity adjust/remove, subtotal
- **`/shop/checkout`** — fulfillment method (shipping/local pickup), phone, address; requires sign-in
- **`/shop/orders/[id]`** — order confirmation, visible to the buyer or an admin

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
single Prisma transaction, then redirects to the confirmation page.
Expected failures (out of stock, missing address, unavailable product)
return `{ error }` instead of throwing, so the checkout form can show
the message inline rather than crashing.

### Admin CMS (`/admin/shop/...`)
- **Products** — full create/edit/delete, with price (whole KES),
  SKU, inventory, category, shipping/pickup toggles, featured flag
- **Orders** — list with buyer contact info, itemized contents, and
  an inline status dropdown (`PENDING` → `CONFIRMED` → `FULFILLED`,
  or `CANCELLED`) that updates immediately without a page reload

### Data model additions
`Product`, `Order`, `OrderItem` — see `prisma/schema.prisma`. Prices
are stored as whole KES integers (no decimals) to avoid float
rounding; `OrderItem.unitPrice` snapshots the price at purchase time
so later price changes don't rewrite order history.

## What's new in Phase 3 — Partner Portal

A public application workflow for businesses that want to work with
Visit Taita, plus a self-service dashboard for approved sellers.

### Public pages
- **`/partners`** — what partnering looks like, the partner types on offer
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
- New listings always save as `DRAFT` — an admin reviews and publishes
  them from `/admin/shop/products`, same as any other product

### Data model additions
`PartnerApplication` — see `prisma/schema.prisma`. `partnerType` covers
the eight categories from the original brief (accommodation, experience,
food, transport, creator, marketplace seller, event, sponsor); only
`SELLER` has a working "grant access" path today, since that's the only
partner type with a dashboard built so far.

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

**Not started:** Taita Week festival platform, experience/accommodation
bookings, sponsorship management, payment integrations (M-Pesa +
cards), interactive map, mobile app, match reports/photos/video,
ticketing and hospitality packages for Taita Cup.

## Not yet implemented

- No image upload — image fields are URLs (paste an image link).
- No password reset / email verification flow.
- No rich-text editor for story bodies — plain textarea.
- No OAuth providers configured (Google/etc.) — credentials only for now, but NextAuth makes adding one straightforward.
- No rate limiting on auth/newsletter/partner-application endpoints yet.
- Taita Cup: no ticketing, no match reports, no live score updates (status/scores are set manually in the admin), no multi-season/tournament history — the schema assumes a single ongoing competition.
- Taita Made: no payment gateway — orders are placed unpaid and confirmed by phone; no shipping cost calculation; no buyer-facing order history page (only the single order confirmation link).
- Partner portal: no email notifications (applicants don't get an email when approved/rejected — they have to check `/partners/apply` themselves); no invite flow (an applicant must already have a Visit Taita account before "grant seller access" can promote them); only the `SELLER` partner type has a working dashboard — `ACCOMMODATION`, `EXPERIENCE`, `FOOD`, `TRANSPORT`, `CREATOR`, `EVENT` and `SPONSOR` applications can be reviewed and approved, but there's no dedicated tooling for them yet, since Visit Taita doesn't have accommodation/experience/event listing features built at all (those are still on the roadmap).
