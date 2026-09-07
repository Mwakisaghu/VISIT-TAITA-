// ---------------------------------------------------------------------------
// SAMPLE / DEMO CONTENT
// Everything in this file is placeholder copy for layout and design purposes.
// Place names are real (Taita Taveta geography is public knowledge), but
// descriptions, hours, prices and contact details are NOT verified and must
// be replaced with confirmed information before this goes live. See README.
// ---------------------------------------------------------------------------

export type DiscoverCategory =
  | "wild"
  | "culture"
  | "adventure"
  | "food"
  | "sport"
  | "people";

export interface Destination {
  slug: string;
  name: string;
  category: DiscoverCategory;
  region: string;
  blurb: string;
  image: string;
  isDemo: true;
}

export interface Story {
  slug: string;
  title: string;
  category: "People" | "Places" | "Culture" | "Sport" | "Adventure";
  excerpt: string;
  readingTime: string;
  image: string;
  isDemo: true;
}

export interface TaitaEvent {
  slug: string;
  name: string;
  program: "Taita Cup" | "Taita Week" | "Taita Sound";
  date: string;
  location: string;
  blurb: string;
  isDemo: true;
}

export const destinations: Destination[] = [
  {
    slug: "ngangao-forest",
    name: "Ngangao Forest",
    category: "wild",
    region: "Dawida Hills",
    blurb:
      "One of the last indigenous cloud forests of the Taita Hills, thick with mist, birdsong and species found nowhere else on Earth.",
    image:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200",
    isDemo: true,
  },
  {
    slug: "lake-chala",
    name: "Lake Chala",
    category: "wild",
    region: "Kenya–Tanzania border",
    blurb:
      "A crater lake shared with Tanzania, its still turquoise water ringed by steep volcanic walls and quiet enough to hear your own footsteps.",
    image:
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1200",
    isDemo: true,
  },
  {
    slug: "wundanyi-town",
    name: "Wundanyi",
    category: "culture",
    region: "Taita Hills",
    blurb:
      "The hill town at the heart of Taita life — markets, mist and a view over the plains that stretches all the way to Tsavo.",
    image:
      "https://images.unsplash.com/photo-1466442929976-97f336a657be?q=80&w=1200",
    isDemo: true,
  },
  {
    slug: "sagalla-hill",
    name: "Sagalla Hill",
    category: "adventure",
    region: "Voi",
    blurb:
      "A steep trail rewarding early risers with a sunrise over Tsavo's red earth and, on a clear day, a glimpse of Kilimanjaro.",
    image:
      "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1200",
    isDemo: true,
  },
  {
    slug: "taita-hills-sanctuary",
    name: "Taita Hills Wildlife Sanctuary",
    category: "wild",
    region: "Voi",
    blurb:
      "A private conservancy bordering Tsavo where elephant, buffalo and rare Hirola roam under the shadow of the hills.",
    image:
      "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?q=80&w=1200",
    isDemo: true,
  },
  {
    slug: "dawida-kitchens",
    name: "Dawida Kitchens",
    category: "food",
    region: "Wundanyi",
    blurb:
      "Home kitchens serving mukimo, matumbo and hill-grown bananas the way they've been cooked in Taita for generations.",
    image:
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1200",
    isDemo: true,
  },
];

export const stories: Story[] = [
  {
    slug: "keepers-of-ngangao",
    title: "The Keepers of Ngangao",
    category: "People",
    excerpt:
      "Meet the community foresters who have spent three decades protecting one of Kenya's rarest cloud forests, tree by tree.",
    readingTime: "6 min read",
    image:
      "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1200",
    isDemo: true,
  },
  {
    slug: "48-hours-in-taita",
    title: "48 Hours in Taita",
    category: "Places",
    excerpt:
      "A weekend route through hills, crater lakes and hill-town markets — for travellers with two days and a full tank.",
    readingTime: "8 min read",
    image:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=1200",
    isDemo: true,
  },
  {
    slug: "sound-of-the-hills",
    title: "The Sound of the Hills",
    category: "Culture",
    excerpt:
      "How a new generation of Taita musicians is folding mwazindika rhythm into everything from gospel to Nairobi drill.",
    readingTime: "5 min read",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1200",
    isDemo: true,
  },
];

export const events: TaitaEvent[] = [
  {
    slug: "taita-cup-final",
    name: "Taita Cup Final",
    program: "Taita Cup",
    date: "Sat, 14 Nov",
    location: "Wundanyi Grounds",
    blurb: "Come for the football. Stay for Taita.",
    isDemo: true,
  },
  {
    slug: "taita-week-opening",
    name: "Taita Week — Opening Night",
    program: "Taita Week",
    date: "Fri, 4 Dec",
    location: "Voi Town Square",
    blurb: "A week-long festival of sport, food, music and craft.",
    isDemo: true,
  },
  {
    slug: "hills-sessions",
    name: "The Hills Sessions",
    program: "Taita Sound",
    date: "Sun, 6 Dec",
    location: "Wundanyi",
    blurb: "An evening of live Taita music under the escarpment.",
    isDemo: true,
  },
];

export const discoverCategories: {
  key: DiscoverCategory;
  label: string;
  description: string;
}[] = [
  { key: "wild", label: "Wild", description: "Forests, lakes and the animals between them." },
  { key: "culture", label: "Culture", description: "Hill towns, language, craft and belief." },
  { key: "adventure", label: "Adventure", description: "Trails, summits and slow mornings." },
  { key: "food", label: "Food", description: "What's cooked, grown and shared here." },
  { key: "sport", label: "Sport", description: "Where Taita plays, and who's watching." },
  { key: "people", label: "People", description: "The lives that make this place what it is." },
];
