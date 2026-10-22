import React from "react"; (globalThis as any).React = React;
import { resolveAsync } from "./resolve_async";
import fs from "fs"; import path from "path";
const Module = require("module"); const origLoad = Module._load;
Module._load = function (r: string, ...x: any[]) {
  if (r === "next/image") return { __esModule: true, default: (p: any) => React.createElement("img", { src: p.src, alt: p.alt, "data-priority": p.priority ? "yes" : undefined }) };
  return origLoad.call(this, r, ...x);
};
const DAY = 86_400_000; const T = (d: number, h = 6) => { const x = new Date(Date.now() + d * DAY); x.setUTCHours(h, 0, 0, 0); if (x.getTime() < Date.now()) x.setTime(x.getTime() + DAY); return x; };
const base = { description: "d", image: "/p/x.jpg", region: "Taita Hills", status: "PUBLISHED", featured: false, isDemo: false, priceFrom: 3500, duration: "3 hours", bookingEnabled: true, difficulty: null, elevationGainM: null, altitudeM: null, hostName: null, hostRole: null, hostQuote: null, groupSizeMax: null, category: "ADVENTURE" };
const S = (d: number, cap = 10, taken = 4, status = "OPEN") => ({ startsAt: T(d), capacity: cap, seatsTaken: taken, status });
let EXPS: any[] = []; const calls: { method: string; args: any }[] = [];
const model = (name: string) => new Proxy({}, { get: (_t, method: string) => async (args?: any) => { calls.push({ method: `${name}.${method}`, args }); if (name === "experience" && method === "findMany") return EXPS; if (name === "review" && method === "groupBy") return [{ experienceId: "e4", rating: 5, _count: { _all: 8 } }, { experienceId: "e4", rating: 4, _count: { _all: 4 } }]; return method === "findMany" ? [] : null; } });
(globalThis as any).prisma = new Proxy({}, { get: (_t, name: string) => model(name) });
import { renderToStaticMarkup } from "react-dom/server";
const txt = (h: string) => h.replace(/<script\b[\s\S]*?<\/script>/g, " ").replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]*>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x2F;/g, "/").replace(/\s+/g, " ");
const routeExists = (href: string) => { const p = href.split("#")[0].split("?")[0]; if (p === "/") return true; const segs = p.split("/").filter(Boolean); const walk = (dir: string, i: number): boolean => { if (i === segs.length) return fs.existsSync(path.join(dir, "page.tsx")); const here = path.join(dir, segs[i]); if (fs.existsSync(here) && walk(here, i + 1)) return true; return fs.readdirSync(dir, { withFileTypes: true }).some((e) => e.isDirectory() && /^\[.+\]$/.test(e.name) && walk(path.join(dir, e.name), i + 1)); }; return walk("app", 0); };

async function main() {
  const Page = (await import("@/app/experiences/page")).default as any; const F = await import("@/lib/field-guide");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const render = async (sp?: any, asPromise = false) => { calls.length = 0; const html = renderToStaticMarkup(await resolveAsync(await Page({ searchParams: asPromise ? Promise.resolve(sp ?? {}) : sp }))); return { html, text: txt(html), where: calls.find((c) => c.method === "experience.findMany")?.args }; };
  EXPS = [
    { ...base, id: "e1", slug: "ridge-walk", name: "The ridge walk", difficulty: "MODERATE", elevationGainM: 350, altitudeM: 1420, hostName: "Hosea Mwamburi", hostRole: "Guide", sessions: [S(2, 10, 4), S(3, 10, 8), S(7, 10, 0)] },
    { ...base, id: "e2", slug: "market-lunch", name: "Lunch at the market", category: "FOOD", duration: "2 hours", priceFrom: 1200, sessions: [] },
    { ...base, id: "e3", slug: "basket-weaving", name: "Basket weaving", category: "CULTURE", bookingEnabled: false, priceFrom: null, duration: null, sessions: [] },
    { ...base, id: "e4", slug: "tsavo-dawn", name: "Tsavo at dawn", category: "WILDLIFE", isDemo: true, hostName: "Amina Mwandawiro", hostRole: null, sessions: [S(4, 5, 5), S(5, 5, 4)] },
  ];

  let { html, text, where } = await render();
  t("STRUCTURE: one h1, the headline, the supporting line, four covers each with its own h2", (html.match(/<h1/g) ?? []).length === 1 && /Led by the people who know the way\./.test(text) && /how hard the climb is before you book/.test(text) && (html.match(/<h2/g) ?? []).length === 4 && /4 experiences/.test(text));
  t("LINKS: every cover goes to its own page, and every address on the page is a real route", ["ridge-walk", "market-lunch", "basket-weaving", "tsavo-dawn"].every((s) => html.includes(`href="/experiences/listing/${s}"`)) && [...new Set([...html.replace(/<link\b[^>]*>/g, "").matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((h) => h.startsWith("/")))].every(routeExists));
  const card = (slug: string) => (html.split(`href="/experiences/listing/${slug}"`)[1] ?? "").split("</a>")[0];
  const c1 = txt(card("ridge-walk"));
  t("COVER (full): category, duration, how hard, the climb and 'altitude · zone' as tags, in one voice", /Adventure/.test(c1) && /3 hours/.test(c1) && /Moderate/.test(c1) && /\+350 m/.test(c1) && /1,420 m · Highlands/.test(c1));
  t("COVER (full): the guide is named with their role and initials ('Led by Hosea Mwamburi', 'Guide', 'HM')", /Led by Hosea Mwamburi/.test(c1) && /Guide/.test(c1) && /\bHM\b/.test(card("ridge-walk")));
  t("COVER (full): the next three dates in order with spots, '2 spots left' wording for the nearly-full one, and the price", c1.indexOf(F.eatShort(T(2))) > -1 && c1.indexOf(F.eatShort(T(2))) < c1.indexOf(F.eatShort(T(3))) && c1.indexOf(F.eatShort(T(3))) < c1.indexOf(F.eatShort(T(7))) && /· 6 spots/.test(c1) && /· 2 spots left/.test(c1) && /· 10 spots/.test(c1) && /From KES 3,500 per person/.test(c1) && /Book a date/.test(c1));
  const c2 = txt(card("market-lunch"));
  t("COVER (sparse): no guide, no altitude, no difficulty, no climb — nothing is invented; bookable but with no dates it says so", !/Led by/.test(c2) && !/ m ·| m$|\+\d/.test(c2.replace(/KES [\d,]+/, "")) && !/Easy|Moderate|Hard/.test(c2) && /No dates open right now/.test(c2) && /2 hours/.test(c2));
  const c3 = txt(card("basket-weaving"));
  t("COVER (not bookable online): 'Dates on request', 'Contact for pricing' and 'See details' instead of a booking prompt", /Dates on request/.test(c3) && /Contact for pricing/.test(c3) && /See details/.test(c3) && !/Book a date/.test(c3));
  const c4 = txt(card("tsavo-dawn"));
  t("COVER (full date): a full date still shows ('Full') so people can see it runs; the guide with no role shows just the name", /· Full/.test(c4) && /· 1 spot left/.test(c4) && /Led by Amina Mwandawiro/.test(c4));
  t("RATING: shown only where there are reviews ('★ 4.7 (12)') with a spoken label", /★ 4\.7 \(12\)/.test(c4) && /aria-label="Rated 4\.7 out of 5 from 12 reviews"/.test(card("tsavo-dawn")) && !/★/.test(c1));
  t("DEMO: the sample-listing notice appears when any listing is a demo", /sample listings for layout review/.test(text));
  t("PICTURES: decorative (empty alt) because the title is in the link, and none is loaded eagerly on a list", [...html.matchAll(/<img\b[^>]*>/g)].every((m) => /\salt=""/.test(m[0])) && !/data-priority/.test(html));

  // ===== the filter links =====
  t("FILTERS (none active): five types, 'This weekend' and three levels as links; nothing marked current; no 'Clear filters'", ["wildlife", "culture", "adventure", "food", "wellness"].every((k) => html.includes(`href="/experiences?type=${k}"`)) && html.includes('href="/experiences?when=weekend"') && ["easy", "moderate", "hard"].every((l) => html.includes(`href="/experiences?level=${l}"`)) && !/aria-current/.test(html.split('aria-label="Filter experiences"')[1].split("</nav>")[0]) && !/Clear filters/.test(text));
  ({ html, text, where } = await render({ type: "adventure", level: "easy", when: "weekend" }));
  const nav = html.split('aria-label="Filter experiences"')[1].split("</nav>")[0];
  t("FILTERS (three on): each active one is marked current (aria-current), links keep the others, the active one turns itself off, and 'Clear filters' appears", (nav.match(/aria-current="true"/g) ?? []).length === 3 && nav.includes('href="/experiences?level=easy&amp;when=weekend"') && nav.includes('href="/experiences?type=food&amp;level=easy&amp;when=weekend"') && /Clear filters/.test(text) && /4 experiences match/.test(text));
  t("QUERY (none): only published ones, featured first then by name; sessions limited to open, still to come, three each, and only the fields needed (no booking details)", (await render()).where.where.status === "PUBLISHED" && Object.keys((await render()).where.where).join() === "status" && JSON.stringify((await render()).where.orderBy) === JSON.stringify([{ featured: "desc" }, { name: "asc" }]) && (await render()).where.include.sessions.take === 3 && (await render()).where.include.sessions.where.status === "OPEN" && !!(await render()).where.include.sessions.where.startsAt.gt && Object.keys((await render()).where.include.sessions.select).sort().join() === "capacity,seatsTaken,startsAt,status");
  ({ where } = await render({ type: "food", level: "hard" })); t("QUERY (type + level): narrows by category and difficulty exactly", where.where.category === "FOOD" && where.where.difficulty === "HARD" && !where.where.sessions);
  ({ where } = await render({ when: "weekend" })); const sw = where.where.sessions.some;
  t("QUERY (weekend): needs an OPEN session still to come, inside the coming Saturday–Sunday window (exactly two days, Nairobi midnight)", sw.status === "OPEN" && sw.startsAt.lt.getTime() - sw.startsAt.gte.getTime() === 2 * DAY && Math.abs(sw.startsAt.gt.getTime() - Date.now()) < 10_000 && new Date(sw.startsAt.gte.getTime() + 3 * 3_600_000).getUTCDay() === 6 && new Date(sw.startsAt.gte.getTime() + 3 * 3_600_000).getUTCHours() === 0);
  ({ where } = await render({ type: "<script>", level: "'; DROP TABLE", when: "nope" })); t("🔒 QUERY (junk in the address): unrecognised values are ignored — they never reach the database", Object.keys(where.where).join() === "status");
  const viaPromise = await render({ type: "food" }, true); t("NEXT.JS: works whether searchParams is a plain object (now) or a promise (the next Next.js)", viaPromise.where.where.category === "FOOD" && (await Page({})) !== undefined);

  // ===== empty states =====
  EXPS = []; ({ text } = await render()); t("EMPTY (no listings at all): 'No experiences published yet.', no filter advice, no cards", /No experiences published yet\./.test(text) && !/Clear filters and see everything/.test(text));
  ({ html, text } = await render({ type: "food" })); t("EMPTY (filters match nothing): says so and offers one link back to everything", /Nothing matches those filters yet\./.test(text) && html.includes('href="/experiences"') && /Clear filters and see everything/.test(text));

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} EXPERIENCES PAGE CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
