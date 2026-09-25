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

export type AccommodationTypeSlug =
  | "hotel"
  | "lodge"
  | "guesthouse"
  | "homestay"
  | "campsite";

export const accommodationTypes: {
  key: AccommodationTypeSlug;
  label: string;
  description: string;
}[] = [
  { key: "hotel", label: "Hotels", description: "Modern comfort near town, built for business and leisure." },
  { key: "lodge", label: "Lodges", description: "Ridge-top rooms with a view over the hills." },
  { key: "guesthouse", label: "Guesthouses", description: "Small, personal, and close to everything." },
  { key: "homestay", label: "Homestays", description: "Live with a Taita family, meals included." },
  { key: "campsite", label: "Campsites", description: "Canvas and campfire at the edge of the wild." },
];

export type ExperienceCategorySlug =
  | "wildlife"
  | "culture"
  | "adventure"
  | "food"
  | "wellness";

export const experienceCategories: {
  key: ExperienceCategorySlug;
  label: string;
  description: string;
}[] = [
  { key: "wildlife", label: "Wildlife", description: "Forests, sanctuaries and the animals between them." },
  { key: "culture", label: "Culture", description: "Stories, rhythm and craft, taught firsthand." },
  { key: "adventure", label: "Adventure", description: "Trails, summits and slow mornings." },
  { key: "food", label: "Food", description: "Markets, kitchens and what's grown here." },
  { key: "wellness", label: "Wellness", description: "Slow days built around the hills." },
];
