// Static UI metadata only. Destinations, stories, events and products now
// live in the database (see prisma/schema.prisma + prisma/seed.ts) — this
// file just defines the category slugs shown across the site.

export type DiscoverCategorySlug =
  | "wild"
  | "culture"
  | "adventure"
  | "food"
  | "sport"
  | "people";

export const discoverCategories: {
  key: DiscoverCategorySlug;
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

export type ShopCategorySlug =
  | "clothing"
  | "art"
  | "crafts"
  | "food"
  | "home"
  | "books"
  | "photography"
  | "collectibles";

export const shopCategories: { key: ShopCategorySlug; label: string }[] = [
  { key: "clothing", label: "Clothing" },
  { key: "art", label: "Art" },
  { key: "crafts", label: "Crafts" },
  { key: "food", label: "Food" },
  { key: "home", label: "Home" },
  { key: "books", label: "Books" },
  { key: "photography", label: "Photography" },
  { key: "collectibles", label: "Collectibles" },
];
