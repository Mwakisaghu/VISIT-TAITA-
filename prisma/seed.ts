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
    latitude: -3.383,
    longitude: 38.35,
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
    latitude: -3.317,
    longitude: 37.7,
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
    latitude: -3.398,
    longitude: 38.36,
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
    latitude: -3.45,
    longitude: 38.55,
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
    latitude: -3.43,
    longitude: 38.5,
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
    latitude: -3.396,
    longitude: 38.362,
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

// ---------------------------------------------------------------------------
// Taita Cup — fictional demo clubs, tied to real Taita Taveta towns.
// Club names, rosters, venues and results are all invented for layout
// purposes — replace before this represents a real tournament.
// ---------------------------------------------------------------------------

const venues = [
  {
    slug: "wundanyi-grounds",
    name: "Wundanyi Grounds",
    location: "Wundanyi",
    capacity: 3000,
    image: "https://images.unsplash.com/photo-1459865264687-595d652de67e?q=80&w=1200",
  },
  {
    slug: "voi-stadium",
    name: "Voi Stadium",
    location: "Voi",
    capacity: 5000,
    image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1200",
  },
  {
    slug: "mwatate-community-ground",
    name: "Mwatate Community Ground",
    location: "Mwatate",
    capacity: 2000,
    image: "https://images.unsplash.com/photo-1518604666860-9ed391f76460?q=80&w=1200",
  },
  {
    slug: "taveta-grounds",
    name: "Taveta Grounds",
    location: "Taveta",
    capacity: 2500,
    image: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?q=80&w=1200",
  },
];

const teams = [
  { slug: "wundanyi-hill-stars", name: "Wundanyi Hill Stars", town: "Wundanyi", crest: "⛰️" },
  { slug: "voi-rangers", name: "Voi Rangers", town: "Voi", crest: "🦁" },
  { slug: "mwatate-united", name: "Mwatate United", town: "Mwatate", crest: "🌾" },
  { slug: "taveta-border-fc", name: "Taveta Border FC", town: "Taveta", crest: "🐘" },
];

const playersByTeam: Record<string, { name: string; position: string; number: number }[]> = {
  "wundanyi-hill-stars": [
    { name: "Brian Mwakio", position: "Goalkeeper", number: 1 },
    { name: "Kevin Mwanjala", position: "Defender", number: 4 },
    { name: "Dennis Mwakisha", position: "Midfielder", number: 8 },
    { name: "Felix Mghoi", position: "Forward", number: 9 },
  ],
  "voi-rangers": [
    { name: "Peter Kazungu", position: "Goalkeeper", number: 1 },
    { name: "Josephat Mwakio", position: "Defender", number: 5 },
    { name: "Alex Ngowa", position: "Midfielder", number: 10 },
    { name: "Samuel Mwadime", position: "Forward", number: 11 },
  ],
  "mwatate-united": [
    { name: "Elijah Mwanyumba", position: "Goalkeeper", number: 1 },
    { name: "Victor Mwaguni", position: "Defender", number: 3 },
    { name: "Collins Mwalongo", position: "Midfielder", number: 6 },
    { name: "Brian Mwadime", position: "Forward", number: 7 },
  ],
  "taveta-border-fc": [
    { name: "Moses Kilonzo", position: "Goalkeeper", number: 1 },
    { name: "Daniel Mwang'ombe", position: "Defender", number: 2 },
    { name: "Justus Mwakuwona", position: "Midfielder", number: 8 },
    { name: "Erick Mwadali", position: "Forward", number: 9 },
  ],
};

// [home, away, venue, daysFromNow, result]. Negative days = already played.
const fixtures: {
  home: string;
  away: string;
  venue: string;
  days: number;
  result?: [number, number];
  round: string;
}[] = [
  { home: "wundanyi-hill-stars", away: "voi-rangers", venue: "wundanyi-grounds", days: -21, result: [2, 1], round: "Matchday 1" },
  { home: "mwatate-united", away: "taveta-border-fc", venue: "mwatate-community-ground", days: -21, result: [1, 1], round: "Matchday 1" },
  { home: "voi-rangers", away: "mwatate-united", venue: "voi-stadium", days: -7, result: [3, 0], round: "Matchday 2" },
  { home: "taveta-border-fc", away: "wundanyi-hill-stars", venue: "taveta-grounds", days: -7, result: [0, 2], round: "Matchday 2" },
  { home: "wundanyi-hill-stars", away: "mwatate-united", venue: "wundanyi-grounds", days: 7, round: "Matchday 3" },
  { home: "taveta-border-fc", away: "voi-rangers", venue: "taveta-grounds", days: 7, round: "Matchday 3" },
  { home: "voi-rangers", away: "wundanyi-hill-stars", venue: "voi-stadium", days: 21, round: "Matchday 4" },
  { home: "mwatate-united", away: "taveta-border-fc", venue: "mwatate-community-ground", days: 21, round: "Matchday 4" },
];

const products = [
  {
    slug: "hand-carved-taita-walking-stick",
    name: "Hand-Carved Walking Stick",
    description: "A hill-wood walking stick carved by artisans in Wundanyi, each one slightly different.",
    price: 1800,
    image: "https://images.unsplash.com/photo-1622560480605-d83c853bc935?q=80&w=1200",
    category: "CRAFTS" as const,
    sku: "TM-CRAFT-001",
    inventory: 12,
    featured: true,
  },
  {
    slug: "dawida-honey-500g",
    name: "Dawida Wild Honey (500g)",
    description: "Raw honey harvested from hives kept along the Ngangao forest edge.",
    price: 900,
    image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?q=80&w=1200",
    category: "FOOD" as const,
    sku: "TM-FOOD-001",
    inventory: 30,
    featured: true,
  },
  {
    slug: "taita-hills-print",
    name: "Taita Hills Fine Art Print",
    description: "A signed A3 print of the hills at first light, shot on the Sagalla trail.",
    price: 3500,
    image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=1200",
    category: "PHOTOGRAPHY" as const,
    sku: "TM-PHOTO-001",
    inventory: 8,
    featured: false,
  },
  {
    slug: "wundanyi-woven-basket",
    name: "Wundanyi Woven Basket",
    description: "A market basket hand-woven from sisal, in the pattern Taita mothers have used for generations.",
    price: 1200,
    image: "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?q=80&w=1200",
    category: "HOME" as const,
    sku: "TM-HOME-001",
    inventory: 20,
    featured: false,
  },
  {
    slug: "taita-cup-supporters-scarf",
    name: "Taita Cup Supporters Scarf",
    description: "Wear your colours. A knit scarf in Taita Cup green and gold.",
    price: 1500,
    image: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?q=80&w=1200",
    category: "CLOTHING" as const,
    sku: "TM-CLOTH-001",
    inventory: 40,
    featured: true,
  },
  {
    slug: "taita-folktales-book",
    name: "Taita Folktales — Collected Stories",
    description: "A small-press collection of Taita oral stories, gathered and translated by local elders.",
    price: 1100,
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=1200",
    category: "BOOKS" as const,
    sku: "TM-BOOK-001",
    inventory: 15,
    featured: false,
  },
];

const partnerApplications = [
  {
    businessName: "Dawida Hill Lodge",
    contactName: "Grace Mwakio",
    email: "grace@dawidahilllodge.example",
    phone: "+254712345001",
    website: "https://dawidahilllodge.example",
    partnerType: "ACCOMMODATION" as const,
    message:
      "We run a 12-room lodge overlooking Wundanyi and would like to be listed as an accommodation partner for visitors exploring the hills.",
    status: "PENDING" as const,
  },
  {
    businessName: "Taita Trail Guides",
    contactName: "Peter Mwangeka",
    email: "peter@taitatrailguides.example",
    phone: "+254712345002",
    website: "",
    partnerType: "EXPERIENCE" as const,
    message:
      "Licensed hiking guides for Sagalla, Ngangao and the Dawida ridge trails. Would like to offer bookable guided hikes through the platform.",
    status: "APPROVED" as const,
  },
  {
    businessName: "Mama Chao's Kitchen",
    contactName: "Alice Wanjala",
    email: "alice@mamachaoskitchen.example",
    phone: "+254712345003",
    website: "",
    partnerType: "FOOD" as const,
    message:
      "Home-style Taita cooking in Wundanyi town — mukimo, matumbo and hill-grown vegetables. Interested in being featured under Taita Taste.",
    status: "PENDING" as const,
  },
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

  // --- Taita Cup ---
  for (const v of venues) {
    await prisma.sportVenue.upsert({
      where: { slug: v.slug },
      update: v,
      create: { ...v, isDemo: true },
    });
  }

  const teamIdBySlug = new Map<string, string>();
  for (const t of teams) {
    const record = await prisma.sportTeam.upsert({
      where: { slug: t.slug },
      update: t,
      create: { ...t, isDemo: true },
    });
    teamIdBySlug.set(t.slug, record.id);
  }

  for (const [teamSlug, roster] of Object.entries(playersByTeam)) {
    const teamId = teamIdBySlug.get(teamSlug);
    if (!teamId) continue;
    const existing = await prisma.sportPlayer.findMany({ where: { teamId } });
    if (existing.length > 0) continue; // avoid duplicating players on re-seed
    for (const p of roster) {
      await prisma.sportPlayer.create({ data: { ...p, teamId, isDemo: true } });
    }
  }

  const venueIdBySlug = new Map(
    (await prisma.sportVenue.findMany()).map((v) => [v.slug, v.id])
  );

  for (const f of fixtures) {
    const homeTeamId = teamIdBySlug.get(f.home);
    const awayTeamId = teamIdBySlug.get(f.away);
    const venueId = venueIdBySlug.get(f.venue);
    if (!homeTeamId || !awayTeamId || !venueId) continue;

    const kickoff = new Date();
    kickoff.setDate(kickoff.getDate() + f.days);

    const existing = await prisma.sportFixture.findFirst({
      where: { homeTeamId, awayTeamId, round: f.round },
    });
    if (existing) continue; // avoid duplicating fixtures on re-seed

    await prisma.sportFixture.create({
      data: {
        homeTeamId,
        awayTeamId,
        venueId,
        kickoff,
        round: f.round,
        status: f.result ? "FINISHED" : "SCHEDULED",
        homeScore: f.result?.[0] ?? null,
        awayScore: f.result?.[1] ?? null,
        isDemo: true,
      },
    });
  }

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: { ...p, status: "PUBLISHED", sellerId: admin.id },
      create: { ...p, status: "PUBLISHED", isDemo: true, sellerId: admin.id },
    });
  }

  const existingApplicationCount = await prisma.partnerApplication.count();
  if (existingApplicationCount === 0) {
    await prisma.partnerApplication.createMany({
      data: partnerApplications.map((a) => ({ ...a, website: a.website || null })),
    });
  }

  console.log("Seed complete:");
  console.log(`  ${destinations.length} destinations`);
  console.log(`  ${stories.length} stories`);
  console.log(`  ${events.length} events`);
  console.log(`  ${badges.length} badges`);
  console.log(`  ${venues.length} venues, ${teams.length} teams, ${fixtures.length} fixtures (Taita Cup)`);
  console.log(`  ${products.length} products (Taita Made)`);
  console.log(`  ${partnerApplications.length} sample partner applications`);
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
