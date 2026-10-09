// What to fill in for places, stays and experiences that already exist. Pure functions: the script around them does the database work.
// The one rule that matters: only EMPTY fields are ever filled. Anything someone has entered is left exactly as it is.
const norm = (s) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const empty = (v) => v === null || v === undefined;

/** Match by slug first, then by name (ignoring case, accents and punctuation). Returns the dataset place, or null. */
export function matchPlace(row, places) {
  const bySlug = places.find((p) => p.slug === row.slug); if (bySlug) return bySlug;
  const n = norm(row.name); return places.find((p) => norm(p.name) === n) ?? null;
}

export function planPlaceUpdates(rows, places) {
  const plan = [], unmatched = [];
  for (const row of rows) {
    const p = matchPlace(row, places);
    if (!p) { unmatched.push(row.name); continue; }
    const set = {};
    // A position is two numbers that belong together: fill both or neither, and never half-overwrite one.
    if (empty(row.latitude) && empty(row.longitude)) { set.latitude = p.latitude; set.longitude = p.longitude; }
    if (empty(row.altitudeM) && p.altitudeM !== null && p.altitudeM !== undefined) set.altitudeM = p.altitudeM;
    if (Object.keys(set).length) plan.push({ id: row.id, name: row.name, set, approximate: p.position === "approximate" });
  }
  return { plan, unmatched };
}

export function planListingUpdates(rows, sampleGeo) {
  const plan = [];
  for (const row of rows) {
    const g = sampleGeo[row.name]; if (!g) continue;
    const set = {};
    if (empty(row.latitude) && empty(row.longitude)) { set.latitude = g.latitude; set.longitude = g.longitude; }
    if (empty(row.altitudeM)) set.altitudeM = g.altitudeM;
    if (Object.keys(set).length) plan.push({ id: row.id, name: row.name, set, approximate: true });
  }
  return plan;
}
