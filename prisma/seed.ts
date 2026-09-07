import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Same sample/demo content as the Phase 1 scaffold's lib/data.ts — real
// place names, placeholder descriptions. Replace before launch.
const destinations = [
  {
    slug: "ngangao-forest",
    name: "Ngangao Forest",
    category: "WILD" as const,
    region: "Dawida Hills",
    blurb:
      "One of the last indigenous cloud forests of the Taita Hills, thick with mist, birdsong and species found nowhere else on Earth.",
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200",
    featured: true,
  },
  {
    slug: "lake-chala",
    name: "Lake Chala",
    category: "WILD" as const,
    region: "Kenya–Tanzania border",
    blurb:
      "A crater lake shared with Tanzania, its still turquoise water ringed by steep volcanic walls and quiet enough to hear your own footsteps.",
    image: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1200",
    featured: false,
  },
  {
    slug: "wundanyi-town",
    name: "Wundanyi",
    category: "CULTURE" as const,
    region: "Taita Hills",
    blurb:
      "The hill town at the heart of Taita life — markets, mist and a view over the plains that stretches all the way to Tsavo.",
    image: "https://images.unsplash.com/photo-1466442929976-97f336a657be?q=80&w=1200",
    featured: false,
  },
  {
    slug: "sagalla-hill",
    name: "Sagalla Hill",
    category: "ADVENTURE" as const,
    region: "Voi",
    blurb:
      "A steep trail rewarding early risers with a sunrise over Tsavo's red earth and, on a clear day, a glimpse of Kilimanjaro.",
    image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1200",
    featured: true,
  },
  {
    slug: "taita-hills-sanctuary",
    name: "Taita Hills Wildlife Sanctuary",
    category: "WILD" as const,
    region: "Voi",
    blurb:
      "A private conservancy bordering Tsavo where elephant, buffalo and rare Hirola roam under the shadow of the hills.",
    image: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?q=80&w=1200",
    featured: false,
  },
  {
    slug: "dawida-kitchens",
    name: "Dawida Kitchens",
    category: "FOOD" as const,
    region: "Wundanyi",
    blurb:
      "Home kitchens serving mukimo, matumbo and hill-grown bananas the way they've been cooked in Taita for generations.",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1200",
    featured: false,
  },
];

const stories = [
  {
    slug: "keepers-of-ngangao",
    title: "The Keepers of Ngangao",
    category: "PEOPLE" as const,
    excerpt:
      "Meet the community foresters who have spent three decades protecting one of Kenya's rarest cloud forests, tree by tree.",
    readingTime: "6 min read",
    image: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1200",
    featured: true,
  },
  {
    slug: "48-hours-in-taita",
    title: "48 Hours in Taita",
    category: "PLACES" as const,
    excerpt:
      "A weekend route through hills, crater lakes and hill-town markets — for travellers with two days and a full tank.",
    readingTime: "8 min read",
    image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=1200",
    featured: false,
  },
  {
    slug: "sound-of-the-hills",
    title: "The Sound of the Hills",
    category: "CULTURE" as const,
    excerpt:
      "How a new generation of Taita musicians is folding mwazindika rhythm into everything from gospel to Nairobi drill.",
    readingTime: "5 min read",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1200",
    featured: false,
  },
];

const events = [
  {
    slug: "taita-cup-final",
    name: "Taita Cup Final",
    program: "TAITA_CUP" as const,
    eventDate: new Date("2026-11-14"),
    location: "Wundanyi Grounds",
    blurb: "Come for the football. Stay for Taita.",
  },
  {
    slug: "taita-week-opening",
    name: "Taita Week — Opening Night",
    program: "TAITA_WEEK" as const,
    eventDate: new Date("2026-12-04"),
    location: "Voi Town Square",
    blurb: "A week-long festival of sport, food, music and craft.",
  },
  {
    slug: "hills-sessions",
    name: "The Hills Sessions",
    program: "TAITA_SOUND" as const,
    eventDate: new Date("2026-12-06"),
    location: "Wundanyi",
    blurb: "An evening of live Taita music under the escarpment.",
  },
];

const badges = [
  { key: "TAITA_EXPLORER", label: "Taita Explorer", description: "Visited your first destination.", icon: "🧭" },
  { key: "TAITA_WILD", label: "Taita Wild", description: "Marked a Wild category destination as visited.", icon: "🐘" },
  { key: "TAITA_CULTURE", label: "Taita Culture", description: "Marked a Culture category destination as visited.", icon: "🏺" },
  { key: "TAITA_TRAILS", label: "Taita Trails", description: "Marked an Adventure category destination as visited.", icon: "🥾" },
  { key: "TAITA_TASTE", label: "Taita Taste", description: "Marked a Food category destination as visited.", icon: "🍲" },
  { key: "TAITA_SPORT", label: "Taita Sport", description: "Marked a Sport category destination as visited.", icon: "⚽" },
  { key: "TAITA_INSIDER", label: "Taita Insider", description: "Visited destinations across three or more categories.", icon: "🔑" },
  { key: "TAITA_LEGEND", label: "Taita Legend", description: "Visited every published destination.", icon: "👑" },
];

async function main() {
  // Demo admin account — change this password immediately in any shared environment.
  const adminPasswordHash = await bcrypt.hash("ChangeMe123!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@visittaita.example" },
    update: {},
    create: {
      name: "Visit Taita Admin",
      email: "admin@visittaita.example",
      passwordHash: adminPasswordHash,
      role: "SUPER_ADMIN",
    },
  });

  for (const d of destinations) {
    await prisma.destination.upsert({
      where: { slug: d.slug },
      update: { ...d, status: "PUBLISHED", createdById: admin.id },
      create: { ...d, status: "PUBLISHED", isDemo: true, createdById: admin.id },
    });
  }

  for (const s of stories) {
    await prisma.story.upsert({
      where: { slug: s.slug },
      update: { ...s, status: "PUBLISHED", authorId: admin.id, body: "" },
      create: { ...s, status: "PUBLISHED", isDemo: true, authorId: admin.id, body: "" },
    });
  }

  for (const e of events) {
    await prisma.event.upsert({
      where: { slug: e.slug },
      update: { ...e, status: "PUBLISHED" },
      create: { ...e, status: "PUBLISHED", isDemo: true },
    });
  }

  for (const b of badges) {
    await prisma.badge.upsert({
      where: { key: b.key },
      update: b,
      create: b,
    });
  }

  console.log("Seed complete:");
  console.log(`  ${destinations.length} destinations`);
  console.log(`  ${stories.length} stories`);
  console.log(`  ${events.length} events`);
  console.log(`  ${badges.length} badges`);
  console.log(`  admin login: admin@visittaita.example / ChangeMe123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
