import React from "react"; (globalThis as any).React = React;
import fs from "fs"; import path from "path";
const Module = require("module"); const origLoad = Module._load;
Module._load = function (r: string, ...x: any[]) { return origLoad.call(this, r, ...x); };
const DAY = 86_400_000; const base = { blurb: "A great day out, with food, music and friends.", isDemo: false, status: "PUBLISHED", ticketing: "OFF", ticketsCloseAt: null, ticketCapacity: null, ticketsTaken: 0, ticketPrice: 0, program: "TAITA_WEEK", location: "Wundanyi", organiser: null };
let EVENTS: any[] = []; let ONE: any = null; const calls: { method: string; args: any }[] = [];
const model = (name: string) => new Proxy({}, { get: (_t, method: string) => async (args?: any) => { calls.push({ method: `${name}.${method}`, args }); if (name === "event" && method === "findMany") return EVENTS; if (name === "event" && method === "findUnique") return ONE; return method === "findMany" ? [] : null; } });
(globalThis as any).prisma = new Proxy({}, { get: (_t, name: string) => model(name) });
import { renderToStaticMarkup } from "react-dom/server";
const txt = (h: string) => h.replace(/<script\b[\s\S]*?<\/script>/g, " ").replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]*>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x2F;/g, "/").replace(/\s+/g, " ");
const routeExists = (href: string) => { const p = href.split("#")[0].split("?")[0]; if (p === "/") return true; const segs = p.split("/").filter(Boolean); const has = (dir: string) => fs.existsSync(path.join(dir, "page.tsx")) || fs.existsSync(path.join(dir, "route.ts")); const walk = (dir: string, i: number): boolean => { if (i === segs.length) return has(dir); const here = path.join(dir, segs[i]); if (fs.existsSync(here) && walk(here, i + 1)) return true; return fs.readdirSync(dir, { withFileTypes: true }).some((e) => e.isDirectory() && /^\[.+\]$/.test(e.name) && walk(path.join(dir, e.name), i + 1)); }; return walk("app", 0); };

async function main() {
  const Page = (await import("@/app/events/page")).default as any; const E = await import("@/lib/events-view"); const Cal = await import("@/app/events/[slug]/calendar/route");
  const Facts = (await import("@/components/events/EventFacts")).default as any;
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const NOW0 = new Date(); const inDays = (d: number, h = 9) => { const x = new Date(Date.now() + d * DAY); x.setUTCHours(h, 0, 0, 0); return x; };
  const wk = (() => { const w = (E as any).eatDayStart; const x = require("@/lib/field-guide").weekendWindow(NOW0); return x.from; })();
  const at = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);
  const today = new Date(E.eatDayStart(NOW0).getTime() + 18 * 3_600_000 - 3 * 3_600_000 + 3 * 3_600_000);
  EVENTS = [
    { ...base, id: "t1", slug: "tonight-sound", name: "Sound at the market", program: "TAITA_SOUND", eventDate: new Date(Math.max(E.eatDayStart(NOW0).getTime() + 20 * 3_600_000, NOW0.getTime() + 3_600_000)), ticketing: "FREE", organiser: { name: "Voi Music Collective" } },
    { ...base, id: "t2", slug: "cup-final", name: "Taita Cup final", program: "TAITA_CUP", eventDate: at(wk, 9), ticketing: "PAID", ticketPrice: 500, ticketCapacity: 50, ticketsTaken: 45, location: "Wundanyi stadium", organiser: { name: "Taita Hills Club" }, isDemo: true },
    { ...base, id: "t3", slug: "cup-sunday", name: "Third place match", program: "TAITA_CUP", eventDate: at(wk, 33), ticketing: "PAID", ticketPrice: 300, ticketCapacity: 40, ticketsTaken: 40 },
    { ...base, id: "t4", slug: "far-fair", name: "Harvest fair", eventDate: inDays(90), ticketing: "OFF" },
  ];
  const render = async (sp?: any, asPromise = false) => { calls.length = 0; const html = renderToStaticMarkup(await Page({ searchParams: asPromise ? Promise.resolve(sp ?? {}) : sp })); return { html, text: txt(html), where: calls.find((c) => c.method === "event.findMany")?.args }; };
  process.env.NEXT_PUBLIC_APP_URL = "https://visittaita.co.ke";
  let { html, text, where } = await render();
  t("STRUCTURE: one h1 ('What's on.'), the filter bar, a group heading per non-empty group in the fixed order, and one h2 per event", (html.match(/<h1/g) ?? []).length === 1 && /What's on\./.test(text) && /aria-label="Filter events"/.test(html) && (() => { const expect = E.groupEvents(EVENTS, new Date()).map((g) => g.label); const found = [...html.matchAll(/<h2 id="g-[a-z]+"[^>]*>([^<]+)</g)].map((m) => m[1]); return found.length > 0 && found.join("|") === expect.join("|"); })() && (html.match(/<h2 class=/g) ?? []).length === 4);
  t("LINKS: each event name goes to its page, the Taita Cup and Taita Week links are there, and every address on the page is a real route (including the calendar download)", ["tonight-sound", "cup-final", "cup-sunday", "far-fair"].every((s) => html.includes(`href="/events/${s}"`)) && html.includes('href="/events/taita-cup"') && html.includes('href="/events/taita-week"') && [...new Set([...html.replace(/<link\b[^>]*>/g, "").matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((h) => h.startsWith("/")))].every(routeExists));
  const row = (slug: string) => { const a = html.split(`href="/events/${slug}"`)[1] ?? ""; const start = html.lastIndexOf("<article", html.indexOf(`href="/events/${slug}"`)); return html.slice(start, html.indexOf("</article>", start)); };
  const r2 = row("cup-final"), t2 = txt(r2); const p2 = E.eatParts(EVENTS[1].eventDate);
  t("ROW (paid, nearly full): the big day numeral and weekday·month in Nairobi time, the time, program, venue, organiser, 'KES 500 · 5 left' and 'Get tickets'", new RegExp(`>${p2.day}<`).test(r2) && t2.includes(`${p2.weekday} · ${p2.month}`) && t2.includes(p2.time) && /Taita Cup/.test(t2) && /Wundanyi stadium/.test(t2) && /Organised by Taita Hills Club/.test(t2) && /KES 500 · 5 left/.test(t2) && /Get tickets/.test(t2) && new RegExp(`<time dateTime="${EVENTS[1].eventDate.toISOString()}"`).test(r2));
  const r1 = txt(row("tonight-sound")); t("ROW (free): 'Free tickets' and 'Get a ticket'; no organiser line when none is named is not needed here, and the organiser is shown when present", /Free tickets/.test(r1) && /Get a ticket/.test(r1) && /Organised by Voi Music Collective/.test(r1) && /Taita Sound/.test(r1));
  const r3 = txt(row("cup-sunday")); t("ROW (sold out): 'Sold out' and a plain 'Details' button (no buying prompt), and no organiser line when there is none", /Sold out/.test(r3) && /Details/.test(r3) && !/Get tickets|Get a ticket/.test(r3) && !/Organised by/.test(r3));
  const r4 = txt(row("far-fair")); t("ROW (no ticketing): no ticket label at all, just 'Details'", !/Free tickets|KES|Sold out|Sales closed/.test(r4) && /Details/.test(r4));
  t("ACCESSIBLE NAMES: each button says which event it is for (hidden text 'for Taita Cup final'), so a list of identical 'Get tickets' buttons is not ambiguous", /Get tickets<span class="sr-only"> for Taita Cup final<\/span>/.test(r2));
  t("SHARING: with a public address set, a WhatsApp link (new tab, noopener, announced) carries the name, day, place and the event's full address; and a calendar download link is on every row", /href="https:\/\/wa\.me\/\?text=Taita%20Cup%20final/.test(r2) && decodeURIComponent(r2.match(/wa\.me\/\?text=([^"]+)"/)![1].replace(/&amp;/g, "&")).includes("https://visittaita.co.ke/events/cup-final") && /target="_blank"/.test(r2) && /rel="noopener noreferrer"/.test(r2) && /opens in a new tab/.test(r2) && r2.includes('href="/events/cup-final/calendar"') && /download/.test(r2));
  delete process.env.NEXT_PUBLIC_APP_URL; ({ html } = await render()); t("SHARING: with NO public address configured there is no WhatsApp link at all (it would point nowhere); the calendar link stays", !/wa\.me/.test(html) && html.includes('href="/events/cup-final/calendar"')); process.env.NEXT_PUBLIC_APP_URL = "https://visittaita.co.ke";
  ({ html, text, where } = await render());
  t("DEMO: the sample-fixtures notice appears when any listed event is a demo", /sample fixtures/.test(text));
  // ===== filters
  const nav0 = html.split('aria-label="Filter events"')[1].split("</nav>")[0];
  t("FILTERS (none): 'Upcoming' is current; Today, This weekend, This month, Past events, the three series and 'Free tickets only' are links; no 'Clear filters'", /aria-current="true"[^>]*>Upcoming/.test(nav0) && (nav0.match(/aria-current="true"/g) ?? []).length === 1 && ["today", "weekend", "month", "past"].every((w) => nav0.includes(`href="/events?when=${w}"`)) && ["cup", "week", "sound"].every((s) => nav0.includes(`href="/events?series=${s}"`)) && nav0.includes('href="/events?free=1"') && !/Clear filters/.test(txt(nav0)));
  ({ html, text, where } = await render({ when: "weekend", series: "cup", free: "1" })); const nav1 = html.split('aria-label="Filter events"')[1].split("</nav>")[0];
  t("FILTERS (three on): each is current, links keep the others and an active one turns itself off, 'Upcoming' no longer current, 'Clear filters' shown", (nav1.match(/aria-current="true"/g) ?? []).length === 3 && nav1.includes('href="/events?series=cup&amp;free=1"') && nav1.includes('href="/events?when=weekend&amp;free=1"') && nav1.includes('href="/events?when=weekend&amp;series=cup"') && !/aria-current="true"[^>]*>Upcoming/.test(nav1) && /Clear filters/.test(txt(nav1)));
  t("QUERY (three on): published, the weekend window, the Cup series and free tickets", where.where.status === "PUBLISHED" && where.where.program === "TAITA_CUP" && where.where.ticketing === "FREE" && !!where.where.eventDate.gte && !!where.where.eventDate.lt);
  ({ where } = await render()); t("QUERY (none): published and from the start of today on; soonest first; only the organiser's name is fetched (no contact details)", where.where.status === "PUBLISHED" && !!where.where.eventDate.gte && !where.where.eventDate.lt && JSON.stringify(where.orderBy) === '{"eventDate":"asc"}' && JSON.stringify(where.include) === '{"organiser":{"select":{"name":true}}}');
  const pastRes = await render({ when: "past" }); t("PAST: newest first, one 'Past events' group, and the window ends at the start of today", JSON.stringify(pastRes.where.orderBy) === '{"eventDate":"desc"}' && !!pastRes.where.where.eventDate.lt && /Past events/.test(pastRes.text) && (pastRes.html.match(/<h2 id="g-past"/g) ?? []).length === 1);
  ({ where } = await render({ when: "yesterday", series: "<b>", free: "yes" })); t("🔒 QUERY (junk in the address): unrecognised values are ignored — they never reach the database", where.where.program === undefined && where.where.ticketing === undefined && !!where.where.eventDate.gte && !where.where.eventDate.lt);
  t("NEXT.JS: works with a plain object or a promise for searchParams", (await render({ series: "sound" }, true)).where.where.program === "TAITA_SOUND" && (await Page({})) !== undefined);
  // ===== empty
  const keep = EVENTS; EVENTS = []; ({ html, text } = await render()); t("EMPTY (no upcoming events): says so and links to past events", /No upcoming events yet\./.test(text) && html.includes('href="/events?when=past"'));
  ({ html, text } = await render({ series: "cup" })); t("EMPTY (filters match nothing): says so and offers one link back", /Nothing matches those filters yet\./.test(text) && /Clear filters and see everything/.test(text)); EVENTS = keep;
  // ===== facts band
  const mk = (o: any = {}) => ({ eventDate: EVENTS[1].eventDate, location: "Wundanyi stadium", ticketing: "PAID", status: "PUBLISHED", ticketsCloseAt: null, ticketCapacity: 50, ticketsTaken: 45, ticketPrice: 500, ...o });
  const fh = renderToStaticMarkup(React.createElement(Facts, { event: mk(), now: new Date() })), ft = txt(fh);
  t("FACTS BAND: Date, Time, Where and Tickets as labelled values in a definition list", /<dl/.test(fh) && (fh.match(/<dt/g) ?? []).length === 4 && /Date/.test(ft) && /Time/.test(ft) && /Where Wundanyi stadium/.test(ft) && /Tickets KES 500 · 5 left/.test(ft) && ft.includes(E.eatDateLabel(EVENTS[1].eventDate)));
  t("FACTS BAND: no 'Tickets' cell for an event without ticketing", (renderToStaticMarkup(React.createElement(Facts, { event: mk({ ticketing: "OFF" }), now: new Date() }) ).match(/<dt/g) ?? []).length === 3);
  // ===== calendar route
  ONE = { slug: "cup-final", name: "Taita Cup final, round 2", blurb: "Bring a hat;\nbring friends.", location: "Wundanyi stadium", eventDate: new Date("2026-10-10T06:00:00Z"), status: "PUBLISHED" };
  let resp = await Cal.GET(new Request("http://x/"), { params: { slug: "cup-final" } }); let body = await resp.text();
  t("CALENDAR route: 200, a calendar file download named after the event, the right title/place/start, escaped text, and the event's public address", resp.status === 200 && /^text\/calendar/.test(resp.headers.get("content-type")!) && /attachment; filename="cup-final\.ics"/.test(resp.headers.get("content-disposition")!) && /SUMMARY:Taita Cup final\\, round 2/.test(body) && /DTSTART:20261010T060000Z/.test(body) && /DESCRIPTION:Bring a hat\\;\\nbring friends\./.test(body) && /URL:https:\/\/visittaita\.co\.ke\/events\/cup-final/.test(body));
  resp = await Cal.GET(new Request("http://x/"), { params: Promise.resolve({ slug: "cup-final" }) }); t("CALENDAR route: works with params as a promise too (the next Next.js)", resp.status === 200);
  ONE = { ...ONE, status: "DRAFT" }; resp = await Cal.GET(new Request("http://x/"), { params: { slug: "cup-final" } }); t("🔒 CALENDAR route: an unpublished event is not downloadable (404)", resp.status === 404);
  ONE = null; resp = await Cal.GET(new Request("http://x/"), { params: { slug: "nope" } }); t("CALENDAR route: an unknown event is 404", resp.status === 404);
  ONE = { slug: 'a b";\r\nX-Evil: 1', name: "n", blurb: "b", location: "l", eventDate: new Date(), status: "PUBLISHED" }; resp = await Cal.GET(new Request("http://x/"), { params: { slug: "x" } }); const cd = resp.headers.get("content-disposition")!; t("🔒 CALENDAR route: odd characters in an event address can't break out of the download file name", /^attachment; filename="[A-Za-z0-9-]*\.ics"$/.test(cd) && !/[\r\n;]/.test(cd.replace("attachment;", "")));

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} EVENTS PAGE CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
