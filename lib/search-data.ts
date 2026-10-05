import { prisma } from "@/lib/prisma";
import { SEARCH_LIMITS as L, WEIGHT, highlight, prettyEnum, scoreDocument, snippetSegments, type ParsedQuery, type SearchField, type Segment } from "@/lib/search";
import { STATIC_PAGES } from "@/lib/search-pages";

export const SEARCH_TYPES = [
  { key: "places", label: "Places" },
  { key: "stories", label: "Stories" },
  { key: "stays", label: "Stays" },
  { key: "experiences", label: "Experiences" },
  { key: "shop", label: "Shop" },
  { key: "teams", label: "Taita Cup teams" },
  { key: "creators", label: "Creators" },
  { key: "missions", label: "Missions" },
  { key: "notes", label: "Field Notes" },
  { key: "pages", label: "Pages" },
] as const;

export type SearchTypeKey = (typeof SEARCH_TYPES)[number]["key"];
export const isSearchType = (v: unknown): v is SearchTypeKey => SEARCH_TYPES.some((t) => t.key === v);

export type SearchHit = { type: SearchTypeKey; href: string; title: Segment[]; meta: string | null; snippet: Segment[]; score: number };
export type SearchGroup = { type: SearchTypeKey; label: string; hits: SearchHit[]; hasMore: boolean };
export type SearchResult = { groups: SearchGroup[]; failed: string[]; total: number };

// What each type needs to be turned into a hit. `fields[0]` is always the title.
type Doc = { href: string; titleText: string; meta: string | null; fields: SearchField[]; snippetFrom: (string | null | undefined)[] };

/** Every word must appear in at least one of the columns (case-insensitive). The values are parameters, never part of SQL. */
function termFilter(columns: string[], terms: string[]) {
  return { AND: terms.map((term) => ({ OR: columns.map((c) => ({ [c]: { contains: term, mode: "insensitive" as const } })) })) };
}

const enc = encodeURIComponent;
const join = (...parts: (string | null | undefined)[]) => parts.filter((p): p is string => !!p && p.trim() !== "").join(" · ") || null;

/*
 * VISIBILITY. Each query below applies the SAME public rule as app/sitemap.ts (published stories, products, stays and
 * experiences; active creators; open or closed missions; approved Field Notes; published destinations). A test runs the sitemap
 * and the search over the same data and fails if they ever disagree, so search can't reveal a draft, a hidden note or a paused creator.
 *
 * PRIVACY. Only text that is displayed publicly is selected or searched. Contact emails and phones, SKUs, stock levels, owners,
 * and a Field Note's internal review note are never touched.
 */
const RUNNERS: Record<Exclude<SearchTypeKey, "pages">, (q: ParsedQuery) => Promise<Doc[]>> = {
  async places({ terms }) {
    const rows = await prisma.destination.findMany({
      where: { status: "PUBLISHED", ...termFilter(["name", "blurb", "region"], terms) } as never,
      orderBy: { updatedAt: "desc" }, take: L.candidates,
      select: { slug: true, name: true, category: true, region: true, blurb: true },
    });
    // Destinations have no page of their own: they are cards on their category page, each with an id equal to its slug.
    return rows.map((r) => ({ href: `/discover/${String(r.category).toLowerCase()}#${enc(r.slug)}`, titleText: r.name, meta: join(prettyEnum(r.category), r.region),
      fields: [{ text: r.name, weight: WEIGHT.title }, { text: r.region, weight: WEIGHT.meta }, { text: r.blurb, weight: WEIGHT.summary }], snippetFrom: [r.blurb] }));
  },
  async stories({ terms }) {
    const rows = await prisma.story.findMany({
      where: { status: "PUBLISHED", ...termFilter(["title", "excerpt", "body"], terms) } as never,
      orderBy: { updatedAt: "desc" }, take: L.candidates,
      select: { slug: true, title: true, category: true, excerpt: true, body: true },
    });
    return rows.map((r) => ({ href: `/stories/${enc(r.slug)}`, titleText: r.title, meta: prettyEnum(r.category) || null,
      fields: [{ text: r.title, weight: WEIGHT.title }, { text: r.excerpt, weight: WEIGHT.summary }, { text: r.body, weight: WEIGHT.body }], snippetFrom: [r.excerpt, r.body] }));
  },
  async stays({ terms }) {
    const rows = await prisma.accommodation.findMany({
      where: { status: "PUBLISHED", ...termFilter(["name", "region", "description"], terms) } as never,
      orderBy: { updatedAt: "desc" }, take: L.candidates,
      select: { slug: true, name: true, type: true, region: true, description: true },
    });
    return rows.map((r) => ({ href: `/stay/listing/${enc(r.slug)}`, titleText: r.name, meta: join(prettyEnum(r.type), r.region),
      fields: [{ text: r.name, weight: WEIGHT.title }, { text: r.region, weight: WEIGHT.meta }, { text: r.description, weight: WEIGHT.description }], snippetFrom: [r.description] }));
  },
  async experiences({ terms }) {
    const rows = await prisma.experience.findMany({
      where: { status: "PUBLISHED", ...termFilter(["name", "region", "description"], terms) } as never,
      orderBy: { updatedAt: "desc" }, take: L.candidates,
      select: { slug: true, name: true, category: true, region: true, description: true },
    });
    return rows.map((r) => ({ href: `/experiences/listing/${enc(r.slug)}`, titleText: r.name, meta: join(prettyEnum(r.category), r.region),
      fields: [{ text: r.name, weight: WEIGHT.title }, { text: r.region, weight: WEIGHT.meta }, { text: r.description, weight: WEIGHT.description }], snippetFrom: [r.description] }));
  },
  async shop({ terms }) {
    const rows = await prisma.product.findMany({
      where: { status: "PUBLISHED", ...termFilter(["name", "description"], terms) } as never,
      orderBy: { updatedAt: "desc" }, take: L.candidates,
      select: { slug: true, name: true, category: true, description: true },
    });
    return rows.map((r) => ({ href: `/shop/product/${enc(r.slug)}`, titleText: r.name, meta: prettyEnum(r.category) || null,
      fields: [{ text: r.name, weight: WEIGHT.title }, { text: r.description, weight: WEIGHT.description }], snippetFrom: [r.description] }));
  },
  async teams({ terms }) {
    const rows = await prisma.sportTeam.findMany({
      where: { ...termFilter(["name", "town"], terms) } as never,
      orderBy: { updatedAt: "desc" }, take: L.candidates,
      select: { slug: true, name: true, town: true },
    });
    return rows.map((r) => ({ href: `/events/taita-cup/teams/${enc(r.slug)}`, titleText: r.name, meta: r.town || null,
      fields: [{ text: r.name, weight: WEIGHT.title }, { text: r.town, weight: WEIGHT.meta }], snippetFrom: [] }));
  },
  async creators({ terms }) {
    const rows = await prisma.creator.findMany({
      where: { status: "ACTIVE", ...termFilter(["displayName", "bio", "location"], terms) } as never,
      orderBy: { updatedAt: "desc" }, take: L.candidates,
      select: { slug: true, displayName: true, track: true, bio: true, location: true },
    });
    return rows.map((r) => ({ href: `/creators/${enc(r.slug)}`, titleText: r.displayName, meta: join(prettyEnum(r.track), r.location),
      fields: [{ text: r.displayName, weight: WEIGHT.title }, { text: r.location, weight: WEIGHT.meta }, { text: r.bio, weight: WEIGHT.description }], snippetFrom: [r.bio] }));
  },
  async missions({ terms }) {
    const rows = await prisma.mission.findMany({
      where: { status: { in: ["OPEN", "CLOSED"] }, ...termFilter(["title", "summary", "brief"], terms) } as never,
      orderBy: { updatedAt: "desc" }, take: L.candidates,
      select: { slug: true, title: true, summary: true, brief: true, status: true },
    });
    return rows.map((r) => ({ href: `/missions/${enc(r.slug)}`, titleText: r.title, meta: prettyEnum(r.status) || null,
      fields: [{ text: r.title, weight: WEIGHT.title }, { text: r.summary, weight: WEIGHT.summary }, { text: r.brief, weight: WEIGHT.description }], snippetFrom: [r.summary, r.brief] }));
  },
  async notes({ terms }) {
    const rows = await prisma.fieldNote.findMany({
      where: { status: "APPROVED", ...termFilter(["title", "body"], terms) } as never,
      orderBy: { updatedAt: "desc" }, take: L.candidates,
      select: { slug: true, title: true, body: true, creator: { select: { displayName: true } }, mission: { select: { title: true } } },
    });
    return rows.map((r) => ({ href: `/notes/${enc(r.slug)}`, titleText: r.title, meta: join(r.creator ? `By ${r.creator.displayName}` : null, r.mission?.title),
      fields: [{ text: r.title, weight: WEIGHT.title }, { text: r.body, weight: WEIGHT.body }], snippetFrom: [r.body] }));
  },
};

function pageDocs({ terms }: ParsedQuery): Doc[] {
  return STATIC_PAGES.filter((p) => {
    const hay = [p.title, p.description, ...p.keywords].join(" ").toLowerCase();
    return terms.every((t) => hay.includes(t));
  }).map((p) => ({ href: p.href, titleText: p.title, meta: null,
    fields: [{ text: p.title, weight: WEIGHT.title }, { text: p.keywords.join(" "), weight: WEIGHT.meta }, { text: p.description, weight: WEIGHT.description }], snippetFrom: [p.description] }));
}

function toHit(type: SearchTypeKey, doc: Doc, terms: string[]): SearchHit {
  // Show an excerpt from the first field that actually contains a search word (a story's summary before its body).
  const source = doc.snippetFrom.find((s) => s && terms.some((t) => s.toLowerCase().includes(t))) ?? doc.snippetFrom[0] ?? null;
  return { type, href: doc.href, title: highlight(doc.titleText, terms), meta: doc.meta, snippet: snippetSegments(source, terms), score: scoreDocument(doc.fields, terms) };
}

/**
 * Searches every public content type (or just one). A failure in one type is logged and reported in `failed` — the others
 * still return, so one broken table never turns the whole search into an error page.
 */
export async function searchSite(query: ParsedQuery, only: SearchTypeKey | null = null): Promise<SearchResult> {
  const types = only ? SEARCH_TYPES.filter((t) => t.key === only) : SEARCH_TYPES;
  const limit = only ? L.perTypeFiltered : L.perTypeOverview;

  const settled = await Promise.allSettled(types.map(async (t) => (t.key === "pages" ? pageDocs(query) : RUNNERS[t.key](query))));
  const groups: SearchGroup[] = [];
  const failed: string[] = [];

  settled.forEach((s, i) => {
    const t = types[i];
    if (s.status === "rejected") {
      console.error(`[search] ${t.key} failed`, s.reason);
      failed.push(t.label);
      return;
    }
    const hits = s.value.map((d) => toHit(t.key, d, query.terms)).sort((a, b) => b.score - a.score || a.title.map((x) => x.text).join("").localeCompare(b.title.map((x) => x.text).join("")));
    if (hits.length === 0) return;
    groups.push({ type: t.key, label: t.label, hits: hits.slice(0, limit), hasMore: hits.length > limit });
  });

  return { groups, failed, total: groups.reduce((n, g) => n + g.hits.length, 0) };
}
