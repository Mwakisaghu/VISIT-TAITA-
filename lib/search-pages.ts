// The site's own pages, so a search for "map", "passport" or "taita week" finds them even though they aren't database records.
// Every href here must be a real page (a test checks), and none is private.

export type StaticPage = { title: string; href: string; description: string; keywords: string[] };

export const STATIC_PAGES: StaticPage[] = [
  { title: "Discover Taita", href: "/discover", description: "Wild places, culture, adventure, food, sport and people across Taita Taveta.", keywords: ["places", "explore", "attractions", "things to do"] },
  { title: "Map", href: "/map", description: "Every place on Visit Taita, on one map.", keywords: ["directions", "location", "where"] },
  { title: "Where to stay", href: "/stay", description: "Lodges, homestays and camps run by local hosts.", keywords: ["accommodation", "hotel", "lodge", "homestay", "camp", "book", "sleep"] },
  { title: "Experiences", href: "/experiences", description: "Guided hikes, food tours and cultural circles.", keywords: ["tours", "guides", "activities", "hike", "tour"] },
  { title: "Stories", href: "/stories", description: "People, culture and nature, told by the people who know them.", keywords: ["articles", "read", "blog"] },
  { title: "Events", href: "/events", description: "The Taita Cup, Taita Week and everything in between.", keywords: ["festival", "calendar", "whats on", "what's on"] },
  { title: "Taita Cup", href: "/events/taita-cup", description: "Come for the football. Stay for Taita.", keywords: ["football", "soccer", "tournament", "teams", "cup"] },
  { title: "Taita Week", href: "/events/taita-week", description: "A week of music, food, culture and the outdoors.", keywords: ["festival", "music", "culture", "week"] },
  { title: "Taita Made shop", href: "/shop", description: "Local products and crafts, bought from the makers.", keywords: ["buy", "products", "crafts", "gifts", "marketplace", "store"] },
  { title: "Taita Passport", href: "/passport", description: "Check in at places, earn points and claim rewards.", keywords: ["points", "rewards", "check in", "check-in", "vouchers", "badges", "qr"] },
  { title: "Creators", href: "/creators", description: "The Field Crew: storytellers who show Taita with real evidence.", keywords: ["field crew", "storytellers", "influencers", "writers", "photographers"] },
  { title: "Missions", href: "/missions", description: "Story missions creators can take on.", keywords: ["field crew", "creators", "assignments"] },
  { title: "Field Notes", href: "/notes", description: "Verified notes from people who have been there.", keywords: ["reviews", "reports", "verified"] },
  { title: "Become a partner", href: "/partners", description: "List your stay, experience or products on Visit Taita.", keywords: ["list", "host", "seller", "join", "business"] },
  { title: "Sponsorship", href: "/sponsors", description: "Put your name behind Taita's stories and events.", keywords: ["advertise", "sponsor", "advertising", "brand"] },
  { title: "About Visit Taita", href: "/about", description: "What Visit Taita is and how it works.", keywords: ["who", "mission", "team"] },
  { title: "Contact us", href: "/contact", description: "Get in touch with the Visit Taita team.", keywords: ["email", "phone", "help", "support", "message"] },
  { title: "Privacy Policy", href: "/privacy", description: "What personal data we collect, why, and the choices you have.", keywords: ["data", "gdpr", "cookies", "delete", "personal information"] },
  { title: "Terms of Use", href: "/terms", description: "The terms for using Visit Taita.", keywords: ["rules", "conditions", "legal"] },
];
