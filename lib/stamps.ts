// "Been here" and "Want to go": the small marks a person keeps on places. Pure functions: no database, no browser.
// Been here comes from the Passport's check-ins (QR and GPS are verified; a self-report is marked but earns no points).
export const MAX_WISHES = 100; // per person: a wish list, not a catalogue
export type Been = "none" | "self" | "verified";
export type StampState = { been: Been; want: boolean };
export type Stamps = { signedIn: boolean; visited: Record<string, Been>; wanted: string[] };
export const NO_STAMPS: Stamps = { signedIn: false, visited: {}, wanted: [] };

export const beenOf = (method: string | null | undefined): Been => (method === "QR" || method === "LOCATION" ? "verified" : method === "SELF_REPORTED" ? "self" : "none");
export const stateFor = (s: Stamps, destinationId: string): StampState => ({ been: s.visited[destinationId] ?? "none", want: s.wanted.includes(destinationId) });

/** Adding is refused at the cap; taking a place off the list is always allowed. */
export function wishDecision(existing: boolean, count: number): { action: "add" | "remove" | "refuse"; reason?: string } {
  if (existing) return { action: "remove" };
  if (count >= MAX_WISHES) return { action: "refuse", reason: `Your list is full (${MAX_WISHES} places). Take one off to add another.` };
  return { action: "add" };
}

// What the screen does straight away, before the server answers (and undoes if the server says no).
export const applyWish = (s: Stamps, id: string): Stamps => ({ ...s, wanted: s.wanted.includes(id) ? s.wanted.filter((x) => x !== id) : [...s.wanted, id] });
/** A self-reported visit can be marked and un-marked; a verified check-in can't be changed here. */
export function applyBeen(s: Stamps, id: string): Stamps {
  const cur = s.visited[id] ?? "none"; if (cur === "verified") return s;
  const visited = { ...s.visited }; if (cur === "self") delete visited[id]; else visited[id] = "self";
  return { ...s, visited };
}

/** Reads what the server sent, defensively: only the expected shapes, bounded in size, anything else ignored. */
export function sanitizeStamps(raw: unknown): Stamps {
  if (!raw || typeof raw !== "object") return NO_STAMPS; const r = raw as Record<string, unknown>;
  if (r.signedIn !== true) return NO_STAMPS;
  const id = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 64;
  const visited: Record<string, Been> = {};
  if (r.visited && typeof r.visited === "object") for (const [k, v] of Object.entries(r.visited as Record<string, unknown>).slice(0, 2000)) if (id(k) && (v === "self" || v === "verified")) visited[k] = v;
  const wanted = Array.isArray(r.wanted) ? [...new Set(r.wanted.filter(id))].slice(0, 2000) : [];
  return { signedIn: true, visited, wanted };
}

/** "12 people want to go · 1 person has been here", or nothing when both are zero. */
export function countLabel(want: number, been: number): string | null {
  const w = Math.max(0, Math.floor(want || 0)), b = Math.max(0, Math.floor(been || 0)); const parts: string[] = [];
  if (w > 0) parts.push(`${w} ${w === 1 ? "person wants" : "people want"} to go`);
  if (b > 0) parts.push(`${b} ${b === 1 ? "person has" : "people have"} been here`);
  return parts.length ? parts.join(" · ") : null;
}

/**
 * Runs one change the way the screen should: the optimistic result is what is shown while the server works; if the server refuses, or the
 * connection fails, the person gets the old state back and a plain message. Never leaves the screen claiming something that was not saved.
 */
export async function settle(before: Stamps, apply: (s: Stamps) => Stamps, call: () => Promise<{ ok: boolean; error?: string } | void>): Promise<{ stamps: Stamps; error: string | null }> {
  const optimistic = apply(before);
  try {
    const r = await call();
    if (r && r.ok === false) return { stamps: before, error: r.error ?? "Couldn't save that. Please try again." };
    return { stamps: optimistic, error: null };
  } catch {
    return { stamps: before, error: "Couldn't save that. Please check your connection and try again." };
  }
}
