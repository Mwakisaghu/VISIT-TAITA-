# Visit Taita — Phase 1 MVP Scaffold

**More than a place.**

This is a Phase 1 scaffold for Visit Taita, built from the master product
brief: a Next.js (App Router) site with a cinematic homepage, a Discover
section (six categories: Wild, Culture, Adventure, Food, Sport, People),
an editorial Stories section, and an Events listing (Taita Cup / Taita
Week / Taita Sound). It follows the brief's own phasing — Passport,
membership, marketplace and bookings are intentionally out of scope for
this phase (see **Roadmap** below).

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** with a custom Visit Taita design-token palette
- **Fraunces** (editorial serif, headlines) + **Manrope** (body/UI), loaded via `next/font/google`
- No database yet — content lives in `lib/data.ts` as typed, clearly-marked sample data (see **Content** below)

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. Requires internet access on first build/dev
run so Next.js can fetch the Google Fonts (Fraunces, Manrope) — if you're
building somewhere offline, temporarily swap `next/font/google` in
`app/layout.tsx` for a system font stack.

```bash
npm run build   # production build
npm run start   # serve the production build
```

## Project structure

```
app/
  layout.tsx            Root layout — fonts, global metadata, nav/footer
  page.tsx               Homepage
  discover/page.tsx       Discover index (6 categories)
  discover/[category]/    Category pages (wild, culture, adventure, food, sport, people)
  stories/page.tsx        Stories index
  stories/[slug]/         Story article template
  events/page.tsx         Events listing
  sitemap.ts, robots.ts   SEO
  not-found.tsx           Branded 404
components/               Nav, Footer, Hero, cards, section heading, newsletter
lib/data.ts               Sample destinations, stories and events (typed)
```

## Content — read before publishing anything

Everything in `lib/data.ts` is placeholder content for layout and design
review. Place names (Ngangao Forest, Lake Chala, Wundanyi, Sagalla Hill,
Taita Hills Wildlife Sanctuary) are real, public geography — but
descriptions, reading times, event dates and locations are **not
verified** and are marked `isDemo: true`. Every page that renders sample
content shows a small "Sample content for preview" note. Replace
`lib/data.ts` with real, verified content (or wire it up to a CMS/database
— see Roadmap) before this goes live.

## Design tokens

| Token | Hex | Use |
|---|---|---|
| Stone | `#1B1815` | Primary dark background, body text on light |
| Parchment | `#ECE3CD` | Primary light background |
| Rust | `#A6431E` | Primary accent — CTAs, category labels |
| Canopy | `#2B4736` | Secondary dark accent — Cup/Passport sections |
| Ochre | `#C99A3E` | Tertiary accent — hover states, badges |

Fraunces carries headline personality (editorial, warm serif); Manrope
handles body copy and UI so the display type stays the memorable
element rather than competing with itself.

## Roadmap (per the master brief's own phasing)

**Phase 1 (this scaffold):** homepage, destinations, stories, events,
newsletter capture, SEO basics (sitemap/robots/OG/Twitter metadata),
static sample content.

**Phase 2:** Taita Passport (auth + badges + points), Taita Insider
membership, Taita Made marketplace, experience/accommodation bookings,
partner application workflow + partner dashboards, a real CMS/database
(PostgreSQL + Prisma) behind `lib/data.ts`, admin dashboard with
analytics.

**Phase 3:** Taita Cup sports portal (fixtures/standings/tickets), Taita
Week festival platform, sponsorship management, mobile app, loyalty
integrations, payment integrations (M-Pesa + cards).

## Not yet implemented

- Newsletter form currently only prevents default submit — no email
  provider wired up yet.
- No CMS/admin, no database, no auth. Content is static/typed data.
- No interactive map (Section 7 of the brief) yet — that's a
  Phase 2/3 item once destination data is verified and structured.
