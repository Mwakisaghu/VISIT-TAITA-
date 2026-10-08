import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { SEARCH_LIMITS, parseQuery, type Segment } from "@/lib/search";
import { SEARCH_TYPES, isSearchType, searchSite, type SearchResult } from "@/lib/search-data";

// Search results are never indexed (they'd be endless near-duplicate pages), but the links on them can be followed.
export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

// Depends on the query and on live content — never cached.
export const dynamic = "force-dynamic";

/** Matched words are marked with <mark>. Built from plain segments, so nothing from the database is ever treated as HTML. */
function Marked({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, i) =>
        s.hit ? (
          <mark key={i} className="rounded-sm bg-ochre/30 px-0.5 text-stone">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        )
      )}
    </>
  );
}

const BROWSE = [
  { href: "/discover", label: "Discover places" },
  { href: "/stay", label: "Where to stay" },
  { href: "/experiences", label: "Experiences" },
  { href: "/stories", label: "Stories" },
  { href: "/shop", label: "Taita Made shop" },
  { href: "/events", label: "Events" },
];

function clientIp(): string {
  const h = headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string | string[]; type?: string | string[] } }) {
  const rawQ = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const rawType = Array.isArray(searchParams.type) ? searchParams.type[0] : searchParams.type;
  const only = isSearchType(rawType) ? rawType : null;
  const parsed = parseQuery(rawQ);
  const typedSomething = typeof rawQ === "string" && rawQ.trim() !== "";

  let result: SearchResult | null = null;
  let limited = false;
  if (parsed) {
    if (!await checkRateLimit(`search:${clientIp()}`, 60, 60 * 1000)) limited = true;
    else result = await searchSite(parsed, only);
  }
  const onlyLabel = only ? SEARCH_TYPES.find((t) => t.key === only)!.label : null;

  return (
    <div className="px-6 py-14">
      <div className="mx-auto max-w-3xl">
        <p className="font-body text-sm text-rust">Visit Taita</p>
        <h1 className="mt-1 font-display text-4xl text-stone sm:text-5xl">Search</h1>

        <form role="search" action="/search" method="get" className="mt-6 flex gap-3">
          <label className="sr-only" htmlFor="search-q">
            Search Visit Taita
          </label>
          <input
            id="search-q"
            type="search"
            name="q"
            defaultValue={parsed?.display ?? (typeof rawQ === "string" ? rawQ.slice(0, SEARCH_LIMITS.maxQueryLength) : "")}
            maxLength={SEARCH_LIMITS.maxQueryLength}
            placeholder="Places, stories, stays, shops…"
            autoComplete="off"
            className="input min-w-0 flex-1"
          />
          {only && <input type="hidden" name="type" value={only} />}
          <button type="submit" className="focus-ring rounded-full bg-rust px-7 py-2.5 font-body text-sm text-parchment hover:bg-rust-deep">
            Search
          </button>
        </form>

        {!typedSomething && (
          <div className="mt-10">
            <p className="max-w-prose font-body text-stone/70">Search places to visit, stories, stays, experiences, local products, creators and Field Notes.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {BROWSE.map((b) => (
                <Link key={b.href} href={b.href} className="focus-ring rounded-full border border-stone/20 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust">
                  {b.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {typedSomething && !parsed && <p className="mt-10 font-body text-stone/70">Type at least two letters to search.</p>}

        {limited && <p className="mt-10 font-body text-stone/70">You&apos;re searching very quickly — please wait a moment and try again.</p>}

        {parsed && result && (
          <div className="mt-10" aria-live="polite">
            {result.failed.length > 0 && (
              <p role="status" className="mb-6 rounded-sm border border-ochre/50 bg-ochre/10 p-3 font-body text-sm text-stone/80">
                Some results couldn&apos;t be loaded ({result.failed.join(", ")}). Please try again in a moment.
              </p>
            )}

            {result.total === 0 && result.failed.length === 0 && (
              <div>
                <p className="font-display text-2xl text-stone">No results for “{parsed.display}”</p>
                <p className="mt-3 max-w-prose font-body text-stone/70">Check the spelling, try fewer or different words, or browse instead:</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {BROWSE.map((b) => (
                    <Link key={b.href} href={b.href} className="focus-ring rounded-full border border-stone/20 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust">
                      {b.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {result.total > 0 && (
              <p className="font-body text-sm text-stone/60">
                {onlyLabel ? (
                  <>
                    {onlyLabel} matching “{parsed.display}” ·{" "}
                    <Link href={`/search?q=${encodeURIComponent(parsed.display)}`} className="underline hover:text-rust">
                      show all results
                    </Link>
                  </>
                ) : (
                  <>Best matches for “{parsed.display}”</>
                )}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-10">
              {result.groups.map((g) => (
                <section key={g.type} aria-labelledby={`group-${g.type}`}>
                  <h2 id={`group-${g.type}`} className="font-display text-2xl text-stone">
                    {g.label}
                  </h2>
                  <ul className="mt-3 divide-y divide-stone/10">
                    {g.hits.map((h) => (
                      <li key={h.href} className="py-4">
                        <Link href={h.href} className="focus-ring font-display text-xl text-stone hover:text-rust">
                          <Marked segments={h.title} />
                        </Link>
                        {h.meta && <p className="mt-0.5 font-body text-xs text-stone/50">{h.meta}</p>}
                        {h.snippet.length > 0 && (
                          <p className="mt-1.5 max-w-prose font-body text-sm leading-relaxed text-stone/70">
                            <Marked segments={h.snippet} />
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                  {g.hasMore && !only && (
                    <Link href={`/search?q=${encodeURIComponent(parsed.display)}&type=${g.type}`} className="mt-2 inline-block font-body text-sm text-rust hover:text-rust-deep">
                      See all {g.label.toLowerCase()} results →
                    </Link>
                  )}
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
