import React from "react"; (globalThis as any).React = React;
import fs from "fs"; import path from "path";
const Module = require("module"); const origLoad = Module._load;
Module._load = function (r: string, ...x: any[]) {
  if (r === "next/navigation") return { usePathname: () => "/", useRouter: () => ({}), notFound() { throw new Error("NF"); } };
  if (r === "next-auth/react") return { useSession: () => ({ data: null, status: "unauthenticated" }), signIn() {}, signOut() {} };
  return origLoad.call(this, r, ...x);
};
(globalThis as any).prisma = new Proxy({}, { get: () => new Proxy({}, { get: () => async () => [] }) });
import { renderToStaticMarkup } from "react-dom/server";
const txt = (h: string) => h.replace(/<[^>]*>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const routeExists = (href: string) => { const p = href.split("#")[0].split("?")[0]; const segs = p.split("/").filter(Boolean); const has = (d: string) => fs.existsSync(path.join(d, "page.tsx")) || fs.existsSync(path.join(d, "route.ts")); const walk = (dir: string, i: number): boolean => { if (i === segs.length) return has(dir); const here = path.join(dir, segs[i]); if (fs.existsSync(here) && walk(here, i + 1)) return true; return fs.readdirSync(dir, { withFileTypes: true }).some((e) => e.isDirectory() && /^\[.+\]$/.test(e.name) && walk(path.join(dir, e.name), i + 1)); }; return walk("app", 0); };
async function main() {
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const Footer = (await import("@/components/Footer")).default as any; const Plan = (await import("@/components/home/PlanSection")).default as any; const S = await import("@/lib/search-pages");
  const nav = fs.readFileSync("components/Nav.tsx", "utf8"); const mapPage = fs.readFileSync("app/map/page.tsx", "utf8"); const home = fs.readFileSync("app/page.tsx", "utf8");
  const foot = renderToStaticMarkup(await Footer()); const ph = renderToStaticMarkup(React.createElement(Plan)); const px = txt(ph);
  t("HEADER: 'Plan' is one of the main doors, and it is the last one, after Events (the header's own test checks the full order and the phone menu)", /\{ href: "\/plan", label: T\("Plan"\) \},\s*\];/.test(nav));
  t("FOOTER: the Explore list has 'Plan your day' linking to /plan", foot.includes('href="/plan"') && /Plan your day/.test(txt(foot)));
  const entry = S.STATIC_PAGES.find((p: any) => p.href === "/plan");
  t("SEARCH: the site's search knows the planner — it is a search page with a title and description, and typing plan, planner, itinerary, trip, schedule or weekend finds it", !!entry && entry.title === "Build your Taita day" && ["plan", "planner", "itinerary", "trip", "schedule", "weekend"].every((k) => entry.keywords.includes(k)) && entry.description.length > 20);
  t("HOMEPAGE: a planner section (labelled 'Build your Taita day.') with a 'Start planning' link to /plan, an honest 'Nothing is booked until you book it.', and an example day marked as an example", /id="plan-title"/.test(ph) && /Build your\s*Taita day\./.test(px) && /Start planning/.test(px) && ph.includes('href="/plan"') && /Nothing is booked until you book it\./.test(px) && /An example day/.test(px) && /An early start in the hills/.test(px) && /Match day/.test(px) && /A night in a homestay/.test(px) && !/Sunrise hike|Cup final|ridge walk/i.test(px));
  t("HOMEPAGE: the section sits between Experiences and Stories in the page's own order", home.indexOf("<ExperiencesSection") < home.indexOf("<PlanSection") && home.indexOf("<PlanSection") < home.indexOf("<StoriesSection"));
  t("HOMEPAGE (accessibility): one heading in the section, the example is an ordered list, and its decorative dots are hidden from screen readers", (ph.match(/<h2/g) ?? []).length === 1 && /<ol/.test(ph) && (ph.match(/<li/g) ?? []).length === 3 && /aria-hidden="true"/.test(ph));
  t("EXPLORE MAP: a plain-words link under the heading: 'Found a few places you like? Turn them into a day.'", /href="\/plan"/.test(mapPage) && /Found a few places you like\?/.test(mapPage) && /import Link from "next\/link"/.test(mapPage));
  t("EVERY NEW LINK GOES SOMEWHERE REAL: the planner page exists as a route", routeExists("/plan") && routeExists("/plan/abcdefghjkmn") && routeExists("/plan/abcdefghjkmn/calendar") && routeExists("/api/plan/catalogue"));
  t("EXPERIENCES PAGE: the earlier link is still there too", fs.readFileSync("app/experiences/page.tsx", "utf8").includes('href="/plan"') || /<Link href="\/plan"/.test(fs.readFileSync("app/experiences/page.tsx", "utf8")));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} PLAN EXPOSURE CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
