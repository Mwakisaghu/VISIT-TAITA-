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

/** The picture to give a new item: the one named (if it exists), otherwise any existing one, otherwise none (the item is then skipped, never given a broken picture). */
export function pickImage(named, byKey, fallback) {
  const v = named != null && byKey && Object.prototype.hasOwnProperty.call(byKey, named) ? byKey[named] : null;
  const s = typeof v === "string" && v.trim() ? v : typeof fallback === "string" && fallback.trim() ? fallback : null;
  return s;
}
