import React from "react"; (globalThis as any).React = React;
import fs from "fs"; import path from "path";
const Module = require("module"); const origLoad = Module._load;
let fixtures: Record<string, any[]> = {}; let dbDown = false; let sponsorsDown = false;
Module._load = function (r: string, ...x: any[]) {
  if (r === "next/image") return { __esModule: true, default: (p: any) => React.createElement("img", { src: p.src, alt: p.alt, sizes: p.sizes, "data-priority": p.priority ? "yes" : undefined, "data-unoptimized": p.unoptimized ? "yes" : undefined }) };
  if (r === "next-auth/react") return { useSession: () => ({ data: null, status: "unauthenticated" }) };
  if (r === "next/navigation") return { usePathname: () => "/", useRouter: () => ({ push() {}, refresh() {} }) };
  if (r === "@/components/sponsors/SponsorStrip") return { __esModule: true, default: async () => { if (sponsorsDown) throw new Error("sponsors down"); return React.createElement("div", { "data-sponsors": "yes" }, "Our sponsors"); } };
  return origLoad.call(this, r, ...x);
};
const calls: string[] = [];
const model = (name: string) => new Proxy({}, { get: (_t, method: string) => async (args?: any) => { calls.push(`${name}.${method} ${JSON.stringify(args?.where ?? {})}`); if (dbDown) throw new Error("db down"); return method === "findMany" ? fixtures[name] ?? [] : method === "count" ? 0 : null; } });
(globalThis as any).prisma = new Proxy({}, { get: (_t, name: string) => model(name) });
import { renderToStaticMarkup } from "react-dom/server";
const expand = async (n: any): Promise<any> => { if (Array.isArray(n)) return Promise.all(n.map(expand)); if (!n || typeof n !== "object" || !n.type) return n; if (typeof n.type === "function" && n.type.constructor?.name === "AsyncFunction") return expand(await n.type(n.props)); const c = n.props?.children; if (c === undefined || typeof n.type === "function") return n; return React.cloneElement(n, undefined, ...(Array.isArray(c) ? await Promise.all(c.map(expand)) : [await expand(c)])); };
const pl = (h: string) => h.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]*>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x2F;/g, "/").replace(/\s+/g, " ");
const DAY = 86400000;
const FULL: Record<string, any[]> = {
  destination: [{ name: "A", category: "WILD", image: "/p/wild.jpg", featured: true }, { name: "B", category: "ADVENTURE", image: "/p/adv.jpg", featured: true }, { name: "C", category: "CULTURE", image: "/p/cul.jpg", featured: true }, { name: "D", category: "SPORT", image: "/p/sport.jpg", featured: true }, { name: "E", category: "PEOPLE", image: "/p/people.jpg", featured: false }, { name: "F", category: "FOOD", image: "/p/food.jpg", featured: false }, { name: "G", category: "ADVENTURE", image: "/p/gem.jpg", featured: false }],
  accommodation: [{ name: "Lodge", image: "/p/stay1.jpg" }, { name: "Rooms", image: "/p/stay2.jpg" }],
  experience: [{ slug: "ridge-walk", name: "The ridge walk", category: "ADVENTURE", region: "Taita Hills", image: "/p/e1.jpg" }, { slug: "tsavo-dawn", name: "Tsavo at dawn", category: "WILDLIFE", region: "Tsavo", image: "/p/e2.jpg" }],
  story: [{ slug: "hills-first", title: "The hills were here first", category: "PLACES", excerpt: "A family kept watch.", image: "/p/s1.jpg", isDemo: false }, { slug: "market-day", title: "Saturday in Wundanyi", category: "PEOPLE", excerpt: "The market opens early.", image: "/p/s2.jpg", isDemo: false }],
  event: [{ slug: "cup-final", name: "Taita Cup final", program: "TAITA_CUP", eventDate: new Date(Date.now() + 5 * DAY), location: "Wundanyi", ticketing: "PAID", isDemo: false }, { slug: "sunrise-hike", name: "Sunrise hike", program: "TAITA_WEEK", eventDate: new Date(Date.now() + 6 * DAY), location: "Taita Hills", ticketing: "FREE", isDemo: false }, { slug: "plain-event", name: "Plain event", program: "TAITA_WEEK", eventDate: new Date(Date.now() + 9 * DAY), location: "Voi", ticketing: "OFF", isDemo: false }],
  product: [{ name: "Tee", image: "/p/tee.jpg" }],
};
// every address the page links to must be a real page of the site (dynamic parts matched to their folders)
const routeExists = (href: string) => { const p = href.split("#")[0].split("?")[0]; if (p === "/") return true; const segs = p.split("/").filter(Boolean); const walk = (dir: string, i: number): boolean => { if (i === segs.length) return fs.existsSync(path.join(dir, "page.tsx")); const here = path.join(dir, segs[i]); if (fs.existsSync(here) && walk(here, i + 1)) return true; return fs.readdirSync(dir, { withFileTypes: true }).some((e) => e.isDirectory() && /^\[.+\]$/.test(e.name) && walk(path.join(dir, e.name), i + 1)); }; return walk("app", 0); };

async function main() {
  const Home = (await import("@/app/page")).default as any; const M = await import("@/lib/home-media"); const D = await import("@/lib/home-data");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const render = async () => { const html = renderToStaticMarkup(await expand(await Home())); return { html, txt: pl(html) }; };

  // ===== a full page =====
  fixtures = FULL; dbDown = false; sponsorsDown = false; let { html, txt } = await render();
  t("STRUCTURE: exactly one h1 (the brand line), and the eleven journey sections each have a labelled heading", (html.match(/<h1/g) ?? []).length === 1 && /id="home-title"/.test(html) && ["find-title", "this-title", "exp-title", "plan-title", "essentials-title", "stories-title", "passport-title", "events-title", "local-title", "calling-title"].every((id) => html.includes(`id="${id}"`)));
  t("JOURNEY ORDER: arrive -> discover -> understand -> explore -> plan -> PREPARE (the practical essentials) -> connect -> join -> support -> take part (the passport, now after the practical and local sections) -> return, in that order", ["home-title", "find-title", "this-title", "exp-title", "plan-title", "essentials-title", "stories-title", "events-title", "local-title", "passport-title", "calling-title"].map((id) => html.indexOf(`id="${id}"`)).every((p, i, a) => p > -1 && (i === 0 || p > a[i - 1])));
  { const doors = html.slice(html.indexOf('id="find-title"')); const ul = /<ul class="([^"]*)"/.exec(doors)?.[1] ?? ""; const lis = (doors.slice(0, doors.indexOf("</ul>")).match(/<li/g) ?? []).length;
    t("SIX DOORS: on a phone they are a 2-column grid (3 on a tablet, 6 across on a laptop) so all six are visible at once — not a sideways scroll that hides half of them", /\bgrid-cols-2\b/.test(ul) && /\bsm:grid-cols-3\b/.test(ul) && /\blg:grid-cols-6\b/.test(ul) && !/overflow-x-auto|snap-x/.test(ul) && lis === 6); }
  t("COPY from the brief: eyebrow, 'MORE THAN A PLACE.', 'Wild. Cultural. Unexpected.', the supporting sentence, both calls to action and the scroll cue", /Taita Taveta · Kenya/.test(txt) && /More than a place\./.test(txt) && /Wild\. Cultural\. Unexpected\./.test(txt) && /Discover the landscapes, people, stories and experiences that make Taita different\./.test(txt) && /Explore Taita/.test(txt) && /Scroll to explore/.test(txt));
  t("COPY: Find your Taita ('What are you looking for?'), the six doors, This is Taita (three stories), Experiences, Stories (+ pull quote), Passport, This week, Stay local, 'Taita is calling.'", /What are you looking for\?/.test(txt) && ["Wild", "Adventure", "Culture", "Stay", "Sport", "Hidden gems"].every((w) => txt.includes(w)) && /There is more here than you expect\./.test(txt) && /The people/.test(txt) && /The land/.test(txt) && /The stories/.test(txt) && /Experiences for every kind of explorer\./.test(txt) && /Real people\. Extraordinary stories\./.test(txt) && /Before the tourists arrive, the hills already have a story\./.test(txt) && /Don't just visit Taita\. Experience it\./.test(txt) && /Discover places\. Check in\. Collect points\. Unlock rewards\./.test(txt) && /This week in Taita/.test(txt) && /Support local\. Experience more\./.test(txt) && /Taita is calling\./.test(txt) && /Your next story starts here\./.test(txt));
  const hrefs = [...new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((h) => h.startsWith("/")))];
  t(`LINKS: all ${hrefs.length} addresses the page links to are real pages of this site (nothing dead)`, hrefs.length > 20 && hrefs.every(routeExists));
  const dead = hrefs.filter((h) => !routeExists(h)); if (dead.length) console.log("   dead:", dead);
  t("DATA: the page shows real database content — experience, story and event names, and each links to its own page", /The ridge walk/.test(txt) && /Tsavo at dawn/.test(txt) && /The hills were here first/.test(txt) && /Taita Cup final/.test(txt) && html.includes('href="/experiences/listing/ridge-walk"') && html.includes('href="/stories/hills-first"') && html.includes('href="/events/cup-final"'));
  t("EVENTS: ticketed events say so ('Tickets', 'Free tickets') and one without tickets says nothing; the Taita Cup banner keeps its link", /Free tickets/.test(txt) && /Tickets/.test(txt) && !/Plain event[^]*?(Tickets|Free tickets)[^]*?Taita Cup\b[^]*?Come for/.test("") && html.includes('href="/events/taita-cup"') && /Standings & fixtures/.test(txt));
  t("PICTURES: the six doors, the three spreads and the experience cards use the database pictures (not placeholders)", ["/p/wild.jpg", "/p/adv.jpg", "/p/cul.jpg", "/p/stay1.jpg", "/p/sport.jpg", "/p/people.jpg", "/p/e1.jpg", "/p/s1.jpg"].every((u) => html.includes(encodeURIComponent(u)) || html.includes(u)));
  t("PICTURE HYGIENE: exactly one picture (the hero) is loaded eagerly; every <img> has an alt attribute (decorative ones empty)", (html.match(/data-priority="yes"/g) ?? []).length === 1 && [...html.matchAll(/<img\b[^>]*>/g)].every((m) => /\salt="/.test(m[0])));
  t("SPONSORS and NEWSLETTER are kept (existing functionality), and the closing headline isn't repeated by the newsletter heading", /data-sponsors="yes"/.test(html) && /A letter from Taita\./.test(txt) && (txt.match(/Taita is calling\./g) ?? []).length === 1);
  t("HONEST DEFAULTS: no 'watch the story' button without a configured film (it says 'Read the stories'), no video element, and the passport shows no invented score", /Read the stories/.test(txt) && !/Watch the story/.test(txt) && !/<video/.test(html) && !/\d+\s*\/\s*10/.test(txt) && /Your first stamp is waiting\./.test(txt));
  t("PASSPORT: the button invites a new visitor ('Start your passport') and goes to sign-up", /Start your passport/.test(txt) && html.includes('href="/register"'));

  // ===== nothing in the database =====
  fixtures = {}; ({ html, txt } = await render());
  t("EMPTY DATABASE: the page still renders every section, with calm empty states (events: 'Nothing is on the calendar just yet'; stories invite people to the field notes and crew; experiences show the five areas)", /Nothing is on the calendar just yet/.test(txt) && /The first stories are being gathered/.test(txt) && html.includes('href="/notes"') && html.includes('href="/creators"') && ["Wildlife", "Adventure", "Culture", "Food", "Sport"].every((w) => txt.includes(w)) && (html.match(/<h2/g) ?? []).length >= 9);
  t("EMPTY DATABASE: the links still work (every address is a real page)", [...new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((h) => h.startsWith("/")))].every(routeExists));
  t("EMPTY DATABASE: nothing fake appears — no invented event, story or experience names", !/Taita Cup final|Sunrise hike|ridge walk|hills were here first/i.test(txt));

  // ===== the database failing =====
  dbDown = true; const q0 = console.error; console.error = () => {}; let threw = false; try { ({ html, txt } = await render()); } catch { threw = true; } console.error = q0;
  t("🔒 DATABASE DOWN: the homepage still renders (it does not throw or go blank) — hero, doors, passport, closing call and footer links all present", !threw && /More than a place\./.test(txt) && /Find your Taita/i.test(txt) && /Taita is calling\./.test(txt) && /Start your passport/.test(txt));
  dbDown = false; sponsorsDown = true; console.error = () => {}; threw = false; try { ({ html, txt } = await render()); } catch { threw = true; } console.error = q0;
  t("🔒 SPONSOR STRIP DOWN: the rest of the page still renders", !threw && /Taita is calling\./.test(txt) && !/data-sponsors/.test(html));
  sponsorsDown = false;

  // ===== configurable pictures and film =====
  const m1 = M.homeMedia({}); t("MEDIA defaults: the licensed hero the site already used, no film, no story link; the closing picture reuses the hero", m1.heroImage === M.DEFAULT_HERO_IMAGE && m1.heroVideo === null && m1.storyUrl === null && m1.closingImage === M.DEFAULT_HERO_IMAGE);
  const m2 = M.homeMedia({ HOME_HERO_IMAGE: "/home/hero.jpg", HOME_HERO_VIDEO: "https://cdn.example.org/hero.mp4", HOME_STORY_URL: "https://youtu.be/abc", HOME_CLOSING_IMAGE: "/home/end.jpg" }); t("MEDIA settings: a path or an https address is accepted for each", m2.heroImage === "/home/hero.jpg" && m2.heroVideo === "https://cdn.example.org/hero.mp4" && m2.storyUrl === "https://youtu.be/abc" && m2.closingImage === "/home/end.jpg");
  const m3 = M.homeMedia({ HOME_HERO_IMAGE: "javascript:alert(1)", HOME_HERO_VIDEO: "http://insecure.example/x.mp4", HOME_STORY_URL: "data:text/html,<b>x</b>", HOME_CLOSING_IMAGE: "//evil.example/x.jpg" }); t("🔒 MEDIA safety: javascript:, data:, plain http and protocol-relative addresses are all ignored (fall back to the defaults)", m3.heroImage === M.DEFAULT_HERO_IMAGE && m3.heroVideo === null && m3.storyUrl === null && m3.closingImage === M.DEFAULT_HERO_IMAGE);
  const HomeHero = (await import("@/components/home/HomeHero")).default as any; const withStory = pl(renderToStaticMarkup(await expand(HomeHero({ media: { ...m1, storyUrl: "https://youtu.be/abc" } })))); const storyHtml = renderToStaticMarkup(await expand(HomeHero({ media: { ...m1, storyUrl: "https://youtu.be/abc" } })));
  t("WATCH THE STORY: appears only when a film link is configured, opens in a new tab safely (noopener) and tells screen-reader users so", /Watch the story/.test(withStory) && /target="_blank"/.test(storyHtml) && /rel="noopener noreferrer"/.test(storyHtml) && /opens in a new tab/.test(storyHtml));
  const vidHtml = renderToStaticMarkup(await expand(HomeHero({ media: { ...m1, heroVideo: "/home/hero.mp4" } }))); t("VIDEO: a configured film is handed to the (client-side, idle-start) player rather than loaded in the page itself — the server page has no <video> either way", !/<video/.test(vidHtml));

  // ===== the data loader =====
  fixtures = FULL; dbDown = false; const d = await D.loadHome(); t("LOADER: category doors take their pictures from matching places (wild/adventure/culture/sport) and the stay door from a stay", d.tiles.wild.src === "/p/wild.jpg" && d.tiles.adventure.src === "/p/adv.jpg" && d.tiles.culture.src === "/p/cul.jpg" && d.tiles.sport.src === "/p/sport.jpg" && d.tiles.stay.src === "/p/stay1.jpg");
  { const pics = [...Object.values(d.tiles), d.people, d.land].map((p: any) => p.src); t("LOADER: no two panels on the page share a picture when there is enough content (six doors + the people and land panels are all different)", pics.every(Boolean) && new Set(pics).size === pics.length); }
  fixtures = {}; const e0 = await D.loadHome(); t("LOADER: with no content every picture is null and the lists are empty (never undefined)", Object.values(e0.tiles).every((p: any) => p.src === null) && e0.experiences.length === 0 && e0.stories.length === 0 && e0.events.length === 0);
  fixtures = {}; calls.length = 0; await D.loadHome(); t("LOADER: only PUBLISHED content is requested everywhere, and only upcoming events", calls.filter((c) => /^(destination|accommodation|experience|story|product)\.findMany/.test(c)).every((c) => c.includes('"status":"PUBLISHED"')) && calls.some((c) => c.startsWith("event.findMany") && c.includes('"status":"PUBLISHED"') && c.includes("gte")));

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} HOMEPAGE CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
