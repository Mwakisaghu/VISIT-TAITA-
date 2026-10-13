// What the content pack would add to a database that already has things in it. Pure functions: the script around them does the database work.
// The one rule that matters: nothing that already exists (same address) is touched. The pack only ADDS.
const taken = (list) => new Set((list ?? []).map(String));
const ONE = { places: "place", stories: "story", stays: "stay", products: "product" };

export function planContent(have, content) {
  const hs = { stories: taken(have.stories), places: taken(have.places), stays: taken(have.stays), products: taken(have.products), skus: taken(have.skus) };
  const out = { stories: [], places: [], stays: [], products: [], skipped: [] };
  for (const kind of ["places", "stories", "stays", "products"]) {
    for (const item of content[kind] ?? []) {
      if (hs[kind].has(item.slug)) { out.skipped.push(`${ONE[kind]} "${item.slug}" already exists`); continue; }
      if (kind === "products" && item.sku && hs.skus.has(item.sku)) { out.skipped.push(`product "${item.slug}": the code ${item.sku} is already used`); continue; }
      out[kind].push(item); hs[kind].add(item.slug); if (kind === "products" && item.sku) hs.skus.add(item.sku);
    }
  }
  return out;
}

/** What every new item is given for a picture: the site's own "a picture is coming soon" placeholder. Never another item's picture (that is how a photo nobody owns spreads), never a stock photo. */
export const PLACEHOLDER_IMAGE = "/placeholders/taita-placeholder.svg";
