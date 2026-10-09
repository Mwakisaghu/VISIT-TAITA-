// How stories are shaped, filtered and read. Pure functions: no database, no clock.

// ---- The body ---------------------------------------------------------------------------------------------------------------------
// Editors write plain text. A blank line starts a new paragraph. A paragraph whose lines start with ">" becomes a pull quote.
export type Block = { type: "p" | "quote"; text: string };
const MAX_BLOCKS = 400;
export function parseStoryBody(body: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of (body ?? "").replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean); if (lines.length === 0) continue;
    if (lines.every((l) => l.startsWith(">"))) { const text = lines.map((l) => l.replace(/^>\s?/, "")).join(" ").trim(); if (text) blocks.push({ type: "quote", text }); }
    else blocks.push({ type: "p", text: lines.join("\n") });
    if (blocks.length >= MAX_BLOCKS) break;
  }
  return blocks;
}

// ---- Filters on the stories list ---------------------------------------------------------------------------------------------------
export const STORY_TYPES = { people: "PEOPLE", places: "PLACES", culture: "CULTURE", sport: "SPORT", adventure: "ADVENTURE" } as const;
export type StoryCategory = (typeof STORY_TYPES)[keyof typeof STORY_TYPES];
export type StoryFilters = { type: StoryCategory | null };
export function parseStoryFilters(sp: Record<string, string | string[] | undefined>): StoryFilters {
  const v = (Array.isArray(sp.type) ? sp.type[0] : sp.type) ?? "";
  return { type: (STORY_TYPES as Record<string, StoryCategory>)[v.toLowerCase()] ?? null };
}
export function storyFilterHref(f: StoryFilters, type: string | null): string {
  const cur = f.type ? f.type.toLowerCase() : null; const next = type === cur ? null : type;
  return next ? `/stories?type=${next}` : "/stories";
}

// ---- Card shapes -------------------------------------------------------------------------------------------------------------------
/** People get tall portrait covers, places and adventures get wide landscape ones, the rest sit in between. */
export type Shape = "tall" | "wide" | "standard";
export const storyShape = (category: string): Shape => (category === "PEOPLE" ? "tall" : category === "PLACES" || category === "ADVENTURE" ? "wide" : "standard");

// ---- Linking a story to a place: the address of the place's category page ---------------------------------------------------------
const PLACE_PAGES = ["WILD", "CULTURE", "ADVENTURE", "FOOD", "SPORT", "PEOPLE"];
/** Places don't have a page of their own yet, so a place links to its category page. */
export const placeHref = (category: string): string | null => (PLACE_PAGES.includes(category) ? `/discover/${category.toLowerCase()}` : null);
