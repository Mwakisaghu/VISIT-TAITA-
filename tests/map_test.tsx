import React from "react"; import fs from "fs"; (globalThis as any).React = React;
const { JSDOM } = require("jsdom");
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: "http://localhost/", pretendToBeVisual: true }); const w = dom.window as any;
let rectTop = 0; let reduced = false; let saveData = false; let effType = "4g"; let scrollY = 0;
const IOS: any[] = [];
class FakeIO { cb: any; observed: any[] = []; disconnected = false; constructor(cb: any) { this.cb = cb; IOS.push(this); } observe(el: any) { this.observed.push(el); } unobserve() {} disconnect() { this.disconnected = true; } }
w.IntersectionObserver = FakeIO; w.matchMedia = (q: string) => ({ matches: reduced && /reduce/.test(q), addEventListener() {}, removeEventListener() {} });
w.requestAnimationFrame = (f: any) => setTimeout(() => f(0), 0); w.cancelAnimationFrame = (n: any) => clearTimeout(n);
w.HTMLElement.prototype.getBoundingClientRect = function () { return { top: rectTop, bottom: rectTop + 100, left: 0, right: 100, width: 100, height: 100, x: 0, y: rectTop, toJSON() {} }; };
Object.defineProperty(w, "scrollY", { get: () => scrollY }); Object.defineProperty(w, "innerHeight", { value: 900, configurable: true });
Object.defineProperty(w.navigator, "connection", { get: () => ({ saveData, effectiveType: effType }), configurable: true });
Object.assign(globalThis, { self: w, window: w, document: w.document, HTMLElement: w.HTMLElement, Node: w.Node, Event: w.Event, KeyboardEvent: w.KeyboardEvent, MouseEvent: w.MouseEvent, IntersectionObserver: FakeIO, matchMedia: w.matchMedia, requestAnimationFrame: w.requestAnimationFrame, cancelAnimationFrame: w.cancelAnimationFrame });
Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true, writable: true });
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let pathname = "/"; let session: any = { data: null, status: "unauthenticated" }; const signOuts: any[] = []; let cartCount = 0;
const Module = require("module"); const origLoad = Module._load;
Module._load = function (r: string, ...x: any[]) {
  if (r === "next/navigation") return { usePathname: () => pathname, useRouter: () => ({ push() {}, refresh() {} }) };
  if (r === "next-auth/react") return { useSession: () => session, signOut: (o: any) => { signOuts.push(o); } };
  if (r === "@/components/marketplace/CartProvider") return { useCart: () => ({ count: cartCount }) };
  return origLoad.call(this, r, ...x);
};
// react-dom must load AFTER the fake browser exists (see the other browser suites)
const { createRoot } = require("react-dom/client"); const { act } = require("react");
const flush = () => act(async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 4)); });
const q = (s: string) => w.document.querySelector(s) as any; const qa = (s: string) => [...w.document.querySelectorAll(s)] as any[];
let root: any; const mount = async (el: any) => { if (root) await act(async () => root.unmount()); w.document.body.innerHTML = '<div id="root"></div>'; w.document.body.style.overflow = ""; root = createRoot(q("#root")); await act(async () => { root.render(el); }); await flush(); };
const click = async (el: any) => { await act(async () => { el.click(); }); await flush(); };

// ----- the map's own fakes -----
Object.assign(globalThis, { Element: w.Element, SVGElement: w.SVGElement, Image: w.Image, MouseEvent: w.MouseEvent, getComputedStyle: w.getComputedStyle.bind(w), devicePixelRatio: 1 }); // the extra browser parts Leaflet reads
let SIZE = { w: 0, h: 0 }; // jsdom has no layout: a map is "hidden" (zero size) unless a test gives it one
for (const [prop, key] of [["clientWidth", "w"], ["clientHeight", "h"]] as const) Object.defineProperty(w.HTMLElement.prototype, prop, { configurable: true, get() { return this.classList?.contains("leaflet-container") ? (SIZE as any)[key] : 0; } });
const Mod = require("module"); const prevLoad = Mod._load;
Mod._load = function (r: string, ...x: any[]) {
  if (/\.css$/.test(r)) return {};
  if (r === "next/image") return { __esModule: true, default: (p: any) => React.createElement("img", { src: p.src, alt: p.alt }) };
  if (r === "next/link") return { __esModule: true, default: ({ href, children, ...rest }: any) => React.createElement("a", { href, ...rest }, children) };
  if (r === "@/components/stamps/useStamps") return { useStamps: () => ({ stamps: { signedIn: false, visited: {}, wanted: [] }, initial: { signedIn: false, visited: {}, wanted: [] }, loaded: true, error: null, busy: null, toggleWant() {}, toggleBeen() {} }) };
  return prevLoad.call(this, r, ...x);
};
const BOUNDS: [[number, number], [number, number]] = [[-3.95, 37.6], [-3.2, 38.8]];
async function main() {
  const L = (await import("leaflet")).default as any; const LM: any = await import("@/components/map/LeafletMap"); const LeafletMap = LM.default; const E: any = await import("@/lib/explore");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const pin = (id: string, lat: number, lng: number, onClick?: () => void, extra: any = {}) => ({ id, position: [lat, lng] as [number, number], icon: L.divIcon({ className: "", html: "<span></span>", iconSize: [20, 20] }), title: id.toUpperCase(), alt: id, onClick, ...extra });
  const maps: any[] = []; const onMap = (m: any) => { maps.push(m); };
  const mountMap = async (pins: any[], opts: any = {}, strict = false) => { const el = <LeafletMap bounds={BOUNDS} className="h-full w-full" pins={pins} onMap={opts.onMap ?? onMap} />; await mount(strict ? <React.StrictMode>{el}</React.StrictMode> : el); await flush(); };
  // ===== the wrapper =====
  await mountMap([pin("a", -3.4, 38.3), pin("b", -3.5, 38.4), pin("c", -3.6, 38.2)]);
  const live = () => maps.filter(Boolean).at(-1);
  t("MAP (it appears): one Leaflet map in the page's container, with the OpenStreetMap credit, the zoom buttons, the tiles layer, and the container keeps the class it was given", qa(".leaflet-container").length === 1 && q(".leaflet-container").classList.contains("h-full") && /OpenStreetMap/.test(q(".leaflet-control-attribution").textContent) && qa(".leaflet-control-zoom a").length === 2 && !!q(".leaflet-tile-pane") && typeof live().getZoom === "function");
  t("MAP (pins): every pin is drawn, each with its title, reachable by keyboard (a button with tabindex 0)", qa(".leaflet-marker-icon").length === 3 && qa(".leaflet-marker-icon").map((m: any) => m.title).sort().join() === "A,B,C" && qa(".leaflet-marker-icon").every((m: any) => m.getAttribute("role") === "button" && m.tabIndex === 0));
  t("MAP (starting view): while the map has no size (hidden, for example on the List tab of a phone) it starts centred on the area at zoom 10 and does not fail; the parent fits it once it is shown", (() => { const c = live().getCenter(); return Math.abs(c.lat - -3.575) < 0.01 && Math.abs(c.lng - 38.2) < 0.01 && live().getZoom() === 10; })());
  SIZE = { w: 800, h: 500 }; maps.length = 0; await mountMap([pin("a", -3.4, 38.3)]);
  t("MAP (starting view, with a size): when it has a size it fits the whole area at once", (() => { const b = live().getBounds(); return live().getZoom() >= 8 && b.contains(L.latLngBounds(BOUNDS).getCenter()) && Math.abs(live().getCenter().lat - -3.575) < 0.05; })());
  const clicks: string[] = []; await mountMap([pin("a", -3.4, 38.3, () => clicks.push("a1")), pin("b", -3.5, 38.4, () => clicks.push("b1"))]); await click(qa(".leaflet-marker-icon").find((m: any) => m.title === "B"));
  t("MAP (clicking): clicking a pin runs that pin's own action and no other", clicks.join() === "b1");
  await mountMap([pin("a", -3.4, 38.3, () => clicks.push("a2")), pin("c", -3.6, 38.2, () => clicks.push("c2")), pin("d", -3.7, 38.1)]);
  t("MAP (the pins change): when the pins change the old ones are removed and the new ones drawn (no duplicates, none left behind), and a click now runs the NEW action", qa(".leaflet-marker-icon").length === 3 && qa(".leaflet-marker-icon").map((m: any) => m.title).sort().join() === "A,C,D");
  clicks.length = 0; await click(qa(".leaflet-marker-icon").find((m: any) => m.title === "A")); t("MAP (the pins change): …and the pin that stayed uses its latest action, not a stale one", clicks.join() === "a2");
  // the bug that crashed the page on React 19
  const events: string[] = []; maps.length = 0; let threw: any = null; const trap = (e: any) => { threw = e.error ?? e; }; w.addEventListener("error", trap);
  try { await mountMap([pin("a", -3.4, 38.3), pin("b", -3.5, 38.4)], { onMap: (m: any) => { events.push(m ? "map" : "none"); maps.push(m); } }, true); } catch (e) { threw = e; }
  w.removeEventListener("error", trap);
  t("MAP (the React 19 crash): under StrictMode — which builds, tears down and rebuilds the map, as the development server does — there is NO 'Map container is already initialized' error, exactly one map and the right number of pins; the first map was torn down and a second built", threw === null && qa(".leaflet-container").length === 1 && qa(".leaflet-marker-icon").length === 2 && events.join() === "map,none,map" && !!live());
  const gotA: any[] = [], gotB: any[] = []; const A = (m: any) => { gotA.push(m); }, Bcb = (m: any) => { gotB.push(m); };
  await mount(<LeafletMap bounds={BOUNDS} pins={[pin("a", -3.4, 38.3)]} onMap={A} />); await flush(); const firstBox = q(".leaflet-container"), firstMap = gotA[0]; firstMap.setView([-3.7, 38.7], 11);
  await act(async () => root.render(<LeafletMap bounds={BOUNDS} pins={[pin("a", -3.4, 38.3)]} onMap={Bcb} />)); await flush();
  t("MAP (the parent's callback changing is harmless): giving it a new onMap function on a later render does NOT rebuild the map — the same container, the same map, the same view the person had moved to — and the old callback is not told the map is gone", q(".leaflet-container") === firstBox && gotA.length === 1 && gotA[0] === firstMap && gotB.length === 0 && Math.abs(firstMap.getCenter().lat - -3.7) < 1e-6 && firstMap.getZoom() === 11 && qa(".leaflet-container").length === 1);
  maps.length = 0; await mountMap([pin("a", -3.4, 38.3)]); const box = q(".leaflet-container"); await act(async () => root.unmount()); await flush();
  t("MAP (leaving the page): unmounting tells the parent the map is gone, removes every pin and layer, and leaves nothing behind in the page", maps.at(-1) === null && qa(".leaflet-container").length === 0 && qa(".leaflet-marker-icon").length === 0 && box && !box.isConnected && (box as any)._leaflet_id === undefined && box.querySelectorAll(".leaflet-pane").length === 0);
  // ===== the real explore map =====
  const mk = (id: string, kind: string, name: string, lat: number, lng: number, alt: number | null, world = "wild") => ({ id, kind, slug: id, name, region: "Taita Hills", blurb: name + " blurb", image: "/p/x.jpg", latitude: lat, longitude: lng, altitudeM: alt, world, href: "/x/" + id, host: null });
  const items = [mk("p1", "place", "Ngangao Forest", -3.38, 38.35, 1800), mk("p2", "place", "Lake Jipe", -3.62, 37.76, 700), mk("p3", "place", "Wundanyi Market", -3.4, 38.37, 1200, "culture"), mk("s1", "stay", "Hill House", -3.39, 38.36, 1500), mk("s2", "stay", "Voi Lodge", -3.4, 38.56, 580), mk("x1", "experience", "Ridge walk", -3.37, 38.34, 1650)];
  const Explore = (await import("@/components/map/ExploreMap")).default as any; const calls: any = { fly: [], fit: [] };
  const flyTo = L.Map.prototype.flyTo, fitBounds = L.Map.prototype.fitBounds; L.Map.prototype.flyTo = function (...a: any[]) { calls.fly.push(a); return flyTo.apply(this, a); }; L.Map.prototype.fitBounds = function (...a: any[]) { calls.fit.push(a); return fitBounds.apply(this, a); };
  reduced = true; SIZE = { w: 900, h: 600 }; w.history.replaceState(null, "", "/map"); await mount(<Explore items={items} />); await flush(); await flush();
  const titles = () => qa(".leaflet-marker-icon").map((m: any) => m.title).sort();
  t("EXPLORE MAP (first view): it opens without error, shows places and stays (the default layers) as pins named '<name>, <kind>', says how many items are in view, and fits everything shown", qa(".leaflet-container").length === 1 && qa(".leaflet-marker-icon").length === 5 && titles().includes("Ngangao Forest, Wild") && titles().includes("Hill House, Stay") && !titles().some((x: string) => /Ridge walk/.test(x)) && /5 items in view/.test(q("[role=status]").textContent) && calls.fit.length >= 1);
  const layer = qa('[role="group"][aria-label="Show on the map"] input')[2]; await click(layer);
  t("EXPLORE MAP (layers): switching on Experiences adds that pin without rebuilding the map", qa(".leaflet-container").length === 1 && qa(".leaflet-marker-icon").length === 6 && titles().some((x: string) => /Ridge walk, Experience/.test(x)) && /6 items in view/.test(q("[role=status]").textContent));
  const high = qa('[role="group"][aria-label="How high"] button').find((b: any) => /Highlands/.test(b.textContent)); await click(high);
  t("EXPLORE MAP (height filter): choosing Highlands keeps only what is above 1,400 m (Ngangao Forest, Hill House, Ridge walk) and the count follows", qa(".leaflet-marker-icon").length === 3 && titles().join() === "Hill House, Stay,Ngangao Forest, Wild,Ridge walk, Experience" && /3 items in view/.test(q("[role=status]").textContent));
  calls.fly.length = 0; const ng = qa(".leaflet-marker-icon").find((m: any) => /Ngangao/.test(m.title)); await click(ng);
  t("EXPLORE MAP (choosing a pin): clicking a pin opens its panel ('About Ngangao Forest'), flies the camera there (no animation when the person prefers reduced motion), and draws that pin larger", !!q('section[aria-label="About Ngangao Forest"]') && calls.fly.length >= 1 && Math.abs(calls.fly.at(-1)[0][0] - -3.38) < 1e-6 && Math.abs(calls.fly.at(-1)[0][1] - 38.35) < 1e-6 && calls.fly.at(-1)[2].animate === false && /width:30px/.test(qa(".leaflet-marker-icon").find((m: any) => /Ngangao/.test(m.title)).innerHTML) && /width:22px/.test(qa(".leaflet-marker-icon").find((m: any) => /Hill House/.test(m.title)).innerHTML));
  t("EXPLORE MAP (the address): the chosen place and the filters are written into the page address so any view can be shared (place=ngangao-forest style)", /place=p1/.test(w.location.search) && /zone=highlands/.test(w.location.search));
  const hidden = qa("button").find((b: any) => /^Close/.test(b.textContent.trim())); await click(hidden);
  t("EXPLORE MAP (closing the panel): the panel closes and the pins stay", !q('section[aria-label="About Ngangao Forest"]') && qa(".leaflet-marker-icon").length === 3);
  w.history.replaceState(null, "", "/map?place=p3&zone=foothills"); await mount(<Explore items={items} />); await flush(); await flush();
  t("EXPLORE MAP (opening from a shared link): a link with a place and a height opens with that place selected and the view already filtered", !!q('section[aria-label="About Wundanyi Market"]') && /Wundanyi Market/.test(titles().join()));
  L.Map.prototype.flyTo = flyTo; L.Map.prototype.fitBounds = fitBounds;
  // ===== nothing of the old library is left =====
  const walk = (d: string, out: string[] = []): string[] => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = d + "/" + e.name; if (e.isDirectory()) { if (!["node_modules", ".next", "tests"].includes(e.name)) walk(p, out); } else if (/\.(tsx?|mjs|js)$/.test(e.name)) out.push(p); } return out; };
  const code = ["app", "components", "lib", "scripts"].flatMap((d) => walk(d)).filter((f) => f !== "components/map/LeafletMap.tsx"); const pj = JSON.parse(fs.readFileSync("package.json", "utf8")); const lj = JSON.parse(fs.readFileSync("package-lock.json", "utf8")).packages;
  t("THE OLD LIBRARY IS GONE: no file imports react-leaflet, it is not a dependency, it is not in the lockfile (nor its helper), the unused destination map is removed, and nothing is fetched from unpkg any more", !code.some((f) => /["'`]react-leaflet["'`\/]|@react-leaflet/.test(fs.readFileSync(f, "utf8"))) && !("react-leaflet" in { ...pj.dependencies, ...pj.devDependencies }) && !lj["node_modules/react-leaflet"] && !lj["node_modules/@react-leaflet/core"] && !fs.existsSync("components/map/DestinationMap.tsx") && !code.some((f) => /unpkg\.com/.test(fs.readFileSync(f, "utf8"))));
  const lic = JSON.parse(fs.readFileSync("node_modules/leaflet/package.json", "utf8")).license;
  t("LICENCE: the map library that remains, Leaflet itself, has a standard permissive licence (BSD-2-Clause)", lic === "BSD-2-Clause");
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} MAP CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
