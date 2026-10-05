// Site search — the pure parts (no database, no Node-only imports): reading a query, ranking a result, and building a
// snippet with the matched words marked. Nothing here ever produces HTML: highlighting is returned as segments for React to render.

export const SEARCH_LIMITS = {
  minTermLength: 2,
  maxQueryLength: 80,
  maxTerms: 6,
  maxTermLength: 40,
  /** Results shown per content type on the overview. */
  perTypeOverview: 6,
  /** Results shown when the visitor narrows to ONE content type. */
  perTypeFiltered: 30,
  /** How many matches are fetched per type to rank before trimming. */
  candidates: 40,
} as const;

// Little words that would make a natural query ("hiking in taita") match nothing if every one had to appear.
const STOPWORDS = new Set(["the", "a", "an", "in", "of", "to", "and", "or", "for", "at", "on", "is", "are", "with", "near", "from", "by"]);

export type ParsedQuery = {
  /** The cleaned query, for showing back to the visitor. */
  display: string;
  /** Lower-case words that must ALL appear (in any field) for a result to match. */
  terms: string[];
};

/**
 * Turns whatever was typed into a safe, bounded query — or null if there's nothing searchable. LIKE wildcards (% _) and
 * backslashes are stripped: they would otherwise change what the database matches, so a search for "%" must not match everything.
 */
export function parseQuery(input: unknown): ParsedQuery | null {
  const first = Array.isArray(input) ? input[0] : input;
  if (typeof first !== "string") return null;

  const cleaned = first
    .normalize("NFKC")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[%_\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SEARCH_LIMITS.maxQueryLength)
    .trim();
  if (!cleaned) return null;

  const all = [...new Set(cleaned.toLowerCase().split(" ").map((t) => t.slice(0, SEARCH_LIMITS.maxTermLength)).filter(Boolean))];
  const meaningful = all.filter((t) => !STOPWORDS.has(t));
  const terms = (meaningful.length > 0 ? meaningful : all).slice(0, SEARCH_LIMITS.maxTerms);

  // Single letters are too broad to be useful ("a", "x"), so at least one word must be 2+ characters.
  if (!terms.some((t) => t.length >= SEARCH_LIMITS.minTermLength)) return null;
  return { display: cleaned, terms: terms.filter((t) => t.length >= SEARCH_LIMITS.minTermLength || terms.length === 1) };
}

export type SearchField = { text: string | null | undefined; weight: number };

export const WEIGHT = { title: 10, meta: 4, summary: 3, description: 2, body: 1 } as const;

function isWordAt(text: string, index: number, length: number): boolean {
  const before = index === 0 ? " " : text[index - 1];
  const after = index + length >= text.length ? " " : text[index + length];
  return !/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after);
}

/**
 * How well a document matches. The FIRST field must be its title. For each word, the best field it appears in counts
 * (a title hit is worth far more than a hit deep in the body); a title that starts with the word, or contains it as a
 * whole word, scores higher; a title containing ALL the words gets a bonus.
 */
export function scoreDocument(fields: SearchField[], terms: string[]): number {
  let total = 0;
  let allInTitle = terms.length > 0;
  const title = (fields[0]?.text ?? "").toLowerCase();

  for (const term of terms) {
    let best = 0;
    for (const f of fields) {
      const text = (f.text ?? "").toLowerCase();
      if (!text) continue;
      const at = text.indexOf(term);
      if (at === -1) continue;
      let score = f.weight;
      if (f.weight >= WEIGHT.title) score += at === 0 ? 4 : isWordAt(text, at, term.length) ? 3 : 0;
      best = Math.max(best, score);
    }
    total += best;
    if (!title.includes(term)) allInTitle = false;
  }
  if (terms.length > 1 && allInTitle) total += 6;
  return total;
}

export type Segment = { text: string; hit: boolean };

/** Plain readable text from something that may contain markdown or HTML. */
export function stripMarkup(raw: string | null | undefined): string {
  return String(raw ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_#>~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Splits text into pieces, marking the ones that match a search word (case-insensitive). */
export function highlight(text: string, terms: string[]): Segment[] {
  const usable = [...new Set(terms.filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!text) return [];
  if (usable.length === 0) return [{ text, hit: false }];
  const re = new RegExp(`(${usable.map(escapeRegExp).join("|")})`, "gi");
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i), hit: false });
    out.push({ text: m[0], hit: true });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), hit: false });
  return out;
}

/** A short excerpt around the first match (or the start, if the match was elsewhere), with the matched words marked. */
export function snippetSegments(raw: string | null | undefined, terms: string[], max = 170): Segment[] {
  const text = stripMarkup(raw);
  if (!text) return [];
  const lower = text.toLowerCase();
  let at = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }

  let start = 0;
  if (at > 40) {
    start = at - 40;
    const space = text.indexOf(" ", start); // begin on a whole word
    if (space !== -1 && space < at) start = space + 1;
  }
  let end = Math.min(text.length, start + max);
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    if (space > start + max / 2) end = space; // end on a whole word
  }
  const body = text.slice(start, end);
  const segments = highlight(body, terms);
  if (start > 0) segments.unshift({ text: "…", hit: false });
  if (end < text.length) segments.push({ text: "…", hit: false });
  return segments;
}

/** "BOUTIQUE_LODGE" -> "Boutique lodge" */
export function prettyEnum(value: string | null | undefined): string {
  const t = String(value ?? "").replace(/_/g, " ").toLowerCase().trim();
  return t ? t[0].toUpperCase() + t.slice(1) : "";
}
