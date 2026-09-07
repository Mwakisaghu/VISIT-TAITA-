# Visit Taita — Phase 1 + Phase 2

**More than a place.**

A Next.js (App Router) build of Visit Taita. Phase 1 covers the public
site (homepage, Discover, Stories, Events). Phase 2 adds a real database,
authentication, the Taita Passport (badges/points), and an admin CMS for
managing Destinations, Stories and Events.

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
can reach `/admin` (enforced in `middleware.ts`); everything else is
scaffolded in the schema for Phase 3 (partners, sellers, event
managers, creators) but has no dedicated UI yet.

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

**Phase 3 (not started):** Taita Cup sports portal (fixtures/standings/
tickets), Taita Week festival platform, Taita Made marketplace,
experience/accommodation bookings, partner application workflow +
partner dashboards, sponsorship management, payment integrations
(M-Pesa + cards), interactive map, mobile app.

## Not yet implemented

- No image upload — image fields are URLs (paste an image link).
- No password reset / email verification flow.
- No rich-text editor for story bodies — plain textarea.
- No OAuth providers configured (Google/etc.) — credentials only for now, but NextAuth makes adding one straightforward.
- No rate limiting on auth/newsletter endpoints yet.
