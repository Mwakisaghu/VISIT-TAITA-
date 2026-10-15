import React from "react"; (globalThis as any).React = React;
import fs from "fs"; import path from "path";
const Module = require("module"); const origLoad = Module._load;
Module._load = function (r: string, ...x: any[]) {
  if (r === "next/image") return { __esModule: true, default: (p: any) => React.createElement("img", { src: p.src, alt: p.alt, "data-priority": p.priority ? "yes" : undefined }) };
  return origLoad.call(this, r, ...x);
};
const DAY = 86_400_000; const T = (d: number, h = 6) => { const x = new Date(Date.now() + d * DAY); x.setUTCHours(h, 0, 0, 0); if (x.getTime() < Date.now()) x.setTime(x.getTime() + DAY); return x; };
const base = { description: "A family home on the hill with a view over the plains and a kitchen that never closes.", image: "/p/x.jpg", region: "Wundanyi", status: "PUBLISHED", featured: false, isDemo: false, priceFrom: null, altitudeM: null, hostName: null, hostRole: null, hostQuote: null, moods: [], amenities: [] };
let STAYS: any[] = []; let NEARBY: any[] = []; const calls: { method: string; args: any }[] = [];
const model = (name: string) => new Proxy({}, { get: (_t, method: string) => async (args?: any) => { calls.push({ method: `${name}.${method}`, args }); if (name === "accommodation" && method === "findMany") return STAYS; if (name === "experience" && method === "findMany") return NEARBY; if (name === "review" && method === "groupBy") return [{ accommodationId: "a1", rating: 5, _count: { _all: 3 } }]; return method === "findMany" ? [] : null; } });
(globalThis as any).prisma = new Proxy({}, { get: (_t, name: string) => model(name) });
import { renderToStaticMarkup } from "react-dom/server";
const txt = (h: string) => h.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]*>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x2F;/g, "/").replace(/\s+/g, " ");
const routeExists = (href: string) => { const p = href.split("#")[0].split("?")[0]; if (p === "/") return true; const segs = p.split("/").filter(Boolean); const walk = (dir: string, i: number): boolean => { if (i === segs.length) return fs.existsSync(path.join(dir, "page.tsx")); const here = path.join(dir, segs[i]); if (fs.existsSync(here) && walk(here, i + 1)) return true; return fs.readdirSync(dir, { withFileTypes: true }).some((e) => e.isDirectory() && /^\[.+\]$/.test(e.name) && walk(path.join(dir, e.name), i + 1)); }; return walk("app", 0); };

async function main() {
  const Page = (await import("@/app/stay/page")).default as any; const F = await import("@/lib/field-guide"); const D = await import("@/lib/stay-data");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const render = async (sp?: any, asPromise = false) => { calls.length = 0; const html = renderToStaticMarkup(await Page({ searchParams: asPromise ? Promise.resolve(sp ?? {}) : sp })); return { html, text: txt(html), where: calls.find((c) => c.method === "accommodation.findMany")?.args }; };
  STAYS = [
    { ...base, id: "a1", slug: "hill-house", name: "The hill house", type: "HOMESTAY", featured: true, altitudeM: 1500, hostName: "Mama Njeri", hostRole: "Host", hostQuote: "Karibu, make yourself at home.", moods: ["quiet", "view", "market"], priceFrom: 4500 },
    { ...base, id: "a2", slug: "ridge-lodge", name: "Ridge lodge", type: "LODGE", altitudeM: 1250, moods: ["family"], priceFrom: 8000, hostName: "Baba Joseph" },
    { ...base, id: "a3", slug: "plains-camp", name: "Plains camp", type: "CAMPSITE", altitudeM: 600, region: "Tsavo" },
    { ...base, id: "a4", slug: "town-hotel", name: "Town hotel", type: "HOTEL", isDemo: true, region: "Voi" },
  ];

  let { html, text, where } = await render();
  t("STRUCTURE: one h1, the headline and supporting line, four stays, the count", (html.match(/<h1/g) ?? []).length === 1 && /Stay somewhere that feels like part of the journey\./.test(text) && /Every stay has a host you can name/.test(text) && /4 stays/.test(text));
  t("FEATURE: with no filters the featured stay is shown large (h2, its host's quote, a 'See this stay' link) and is NOT repeated in the grid", /See this stay/.test(text) && /Karibu, make yourself at home\./.test(text) && (html.match(/href="\/stay\/listing\/hill-house"/g) ?? []).length === 1 && (html.match(/<h2/g) ?? []).length === 4);
  t("LINKS: every stay links to its own page and every address on the page is a real route", ["hill-house", "ridge-lodge", "plains-camp", "town-hotel"].every((s) => html.includes(`href="/stay/listing/${s}"`)) && [...new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((h) => h.startsWith("/")))].every(routeExists));
  const card = (slug: string) => (html.split(`href="/stay/listing/${slug}"`)[1] ?? "").split("</a>")[0];
  const f1 = txt(html.split("<article")[1].split("</article>")[0]);
  t("FEATURE content: kind, altitude with its zone, the named host with role, price per night", /Homestay/.test(f1) && /1,500 m · Highlands/.test(f1) && /Hosted by Mama Njeri/.test(f1) && /Host/.test(f1) && /From KES 4,500 a night/.test(f1));
  const c2 = txt(card("ridge-lodge"));
  t("CARD (full): kind, altitude zone (Foothills), host, mood, price, with ratings shown only where there are reviews", /Lodge/.test(c2) && /1,250 m · Foothills/.test(c2) && /Hosted by Baba Joseph/.test(c2) && /Family-friendly/.test(c2) && /From KES 8,000/.test(c2) && !/★/.test(c2));
  const c3 = txt(card("plains-camp"));
  t("CARD (sparse): no host, no moods, no price — nothing invented; 'Contact for rates' and the region", !/Hosted by/.test(c3) && !/Quiet|With a view|Family|hiker|market/i.test(c3) && /Contact for rates/.test(c3) && /Tsavo/.test(c3) && /600 m · Plains/.test(c3));
  const c4 = txt(card("town-hotel")); t("CARD (no altitude): the altitude tag is simply absent, not 'null' or 'undefined'", !/null|undefined|NaN/.test(c4) && !/ m ·/.test(c4) && /Hotel/.test(c4));
  t("DEMO: the sample-listing notice appears when any listing is a demo", /sample listings for layout review/.test(text));
  t("PICTURES: decorative (empty alt), and only the featured stay's picture is loaded eagerly", [...html.matchAll(/<img\b[^>]*>/g)].every((m) => /\salt=""/.test(m[0])) && (html.match(/data-priority="yes"/g) ?? []).length === 1);

  // ===== rating
  { STAYS = [{ ...STAYS[0], featured: false }, ...STAYS.slice(1)]; ({ html, text } = await render()); const r1 = txt(card("hill-house")); t("RATING: '★ 5.0 (3)' with a spoken label, only on the stay that has reviews; with nothing featured, every stay is in the grid", /★ 5\.0 \(3\)/.test(r1) && /aria-label="Rated 5\.0 out of 5 from 3 reviews"/.test(card("hill-house")) && !/See this stay/.test(text) && (html.match(/<h2/g) ?? []).length === 4 && /Mama Njeri/.test(r1) && /Quiet · With a view/.test(r1) && !/Near a market/.test(r1)); STAYS[0].featured = true; }

  // ===== filters
  ({ html, text, where } = await render());
  const nav0 = html.split('aria-label="Filter stays"')[1].split("</nav>")[0];
  t("FILTERS (none): five moods, five kinds, three zones as links; nothing marked current; no 'Clear filters'", ["quiet", "view", "family", "hikers-base", "market"].every((m) => nav0.includes(`href="/stay?mood=${m}"`)) && ["hotel", "lodge", "guesthouse", "homestay", "campsite"].every((k) => nav0.includes(`href="/stay?type=${k}"`)) && ["plains", "foothills", "highlands"].every((z) => nav0.includes(`href="/stay?zone=${z}"`)) && !/aria-current/.test(nav0) && !/Clear filters/.test(text));
  ({ html, text, where } = await render({ mood: "quiet", type: "homestay", zone: "highlands" }));
  const nav1 = html.split('aria-label="Filter stays"')[1].split("</nav>")[0];
  t("FILTERS (three on): each active one is marked current, links keep the others, an active one turns itself off, 'Clear filters' appears, and the featured block is hidden while filtering", (nav1.match(/aria-current="true"/g) ?? []).length === 3 && nav1.includes('href="/stay?type=homestay&amp;zone=highlands"') && nav1.includes('href="/stay?type=homestay&amp;mood=view&amp;zone=highlands"') && /Clear filters/.test(text) && !/See this stay/.test(text) && /4 stays match/.test(text));
  t("QUERY (none): only published, featured first then by name", (await render()).where.where.status === "PUBLISHED" && Object.keys((await render()).where.where).join() === "status" && JSON.stringify((await render()).where.orderBy) === JSON.stringify([{ featured: "desc" }, { name: "asc" }]));
  ({ where } = await render({ mood: "quiet", type: "homestay", zone: "highlands" })); t("QUERY (all three): kind, mood (has) and the altitude range for the zone, exactly", where.where.type === "HOMESTAY" && JSON.stringify(where.where.moods) === '{"has":"quiet"}' && JSON.stringify(where.where.altitudeM) === '{"gte":1400}');
  for (const [z, want] of [["plains", '{"lt":900}'], ["foothills", '{"gte":900,"lt":1400}']] as const) { ({ where } = await render({ zone: z })); t(`QUERY (zone ${z}): altitude ${want}`, JSON.stringify(where.where.altitudeM) === want); }
  ({ where } = await render({ type: "castle", mood: "<b>", zone: "moon" })); t("🔒 QUERY (junk in the address): unrecognised values are ignored — they never reach the database", Object.keys(where.where).join() === "status");
  t("NEXT.JS: works with a plain object or a promise for searchParams", (await render({ mood: "view" }, true)).where.where.moods.has === "view" && (await Page({})) !== undefined);

  // ===== empty states
  STAYS = []; ({ text } = await render()); t("EMPTY (none at all): 'No stays published yet.'", /No stays published yet\./.test(text) && !/Clear filters and see everything/.test(text));
  ({ html, text } = await render({ mood: "quiet" })); t("EMPTY (filters match nothing): says so and offers one link back", /Nothing matches those filters yet\./.test(text) && /Clear filters and see everything/.test(text) && html.includes('href="/stay"'));

  // ===== nearby experiences (data)
  calls.length = 0; NEARBY = []; await D.getNearbyExperiences("  Wundanyi ", new Date("2026-10-08T10:00:00Z")); const nq = calls.find((c) => c.method === "experience.findMany")?.args;
  t("NEARBY query: published only, the same region (ignoring case and stray spaces), at most three, and each with at most two open future dates and only the fields needed", nq.where.status === "PUBLISHED" && nq.where.region.equals === "Wundanyi" && nq.where.region.mode === "insensitive" && nq.take === 3 && nq.include.sessions.take === 2 && nq.include.sessions.where.status === "OPEN" && !!nq.include.sessions.where.startsAt.gt && Object.keys(nq.include.sessions.select).sort().join() === "capacity,seatsTaken,startsAt,status");
  calls.length = 0; const none = await D.getNearbyExperiences("   ", new Date()); t("NEARBY query: a blank region asks the database nothing and returns an empty list", none.length === 0 && calls.length === 0);

  // ===== nearby experiences (display) and host card
  const Nearby = (await import("@/components/stay/NearbyExperiences")).default as any; const Host = (await import("@/components/field/HostCard")).default as any; const NOW = new Date();
  t("NEARBY display: nothing at all when there are none (no empty heading)", renderToStaticMarkup(React.createElement(Nearby, { items: [], region: "Wundanyi", now: NOW })) === "");
  const items = [{ slug: "ridge-walk", name: "The ridge walk", image: "/p/e.jpg", duration: "3 hours", difficulty: "MODERATE", priceFrom: 3500, sessions: [{ startsAt: T(2), capacity: 10, seatsTaken: 4, status: "OPEN" }, { startsAt: T(5), capacity: 10, seatsTaken: 9, status: "OPEN" }] }, { slug: "weaving", name: "Basket weaving", image: "/p/f.jpg", duration: null, difficulty: null, priceFrom: null, sessions: [] }];
  const nh = renderToStaticMarkup(React.createElement(Nearby, { items, region: "Wundanyi", now: NOW })); const nt = txt(nh);
  t("NEARBY display: 'Also in Wundanyi', each links to its experience, tags, next dates (soonest first, with the nearly-full wording), and 'Dates on request' / 'Contact for pricing' when unknown", /Also in Wundanyi/.test(nt) && nh.includes('href="/experiences/listing/ridge-walk"') && nh.includes('href="/experiences/listing/weaving"') && /3 hours/.test(nt) && /Moderate/.test(nt) && nt.indexOf(F.eatShort(T(2))) < nt.indexOf(F.eatShort(T(5))) && /1 spot left/.test(nt) && /Dates on request/.test(nt) && /From KES 3,500/.test(nt) && /Contact for pricing/.test(nt) && /aria-labelledby="nearby-title"/.test(nh) && /id="nearby-title"/.test(nh));
  t("NEARBY display: pictures are decorative (empty alt)", [...nh.matchAll(/<img\b[^>]*>/g)].every((m) => /\salt=""/.test(m[0])));
  const hh = renderToStaticMarkup(React.createElement(Host, { name: "Mama Njeri", role: "Host", quote: "Karibu." })); t("HOST CARD: 'Meet your host', 'Hosted by' the name, the role and the quote in quotation marks; a landmark label for screen readers", /Meet your host/.test(txt(hh)) && /Hosted by Mama Njeri/.test(txt(hh)) && /Host/.test(txt(hh)) && /&ldquo;Karibu\.&rdquo;|“Karibu\.”/.test(hh) && /aria-label="Meet your host"/.test(hh));
  t("HOST CARD: without a quote there is no empty quote mark", !/“|&ldquo;/.test(renderToStaticMarkup(React.createElement(Host, { name: "Mama Njeri" }))));

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} STAY PAGE CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
