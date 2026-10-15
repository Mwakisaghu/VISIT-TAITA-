import React from "react"; (globalThis as any).React = React;
const { JSDOM } = require("jsdom");
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: "http://localhost/", pretendToBeVisual: true }); const w = dom.window as any;
let rectTop = 0; let reduced = false; let saveData = false; let effType = "4g"; let scrollY = 0;
const IOS: any[] = [];
class FakeIO { cb: any; observed: any[] = []; disconnected = false; constructor(cb: any) { this.cb = cb; IOS.push(this); } observe(el: any) { this.observed.push(el); } unobserve() {} disconnect() { this.disconnected = true; } }
w.IntersectionObserver = FakeIO; let phone = false; const mqListeners: any[] = []; w.matchMedia = (q: string) => ({ get matches() { return (reduced && /reduce/.test(q)) || (phone && /max-width: 639px/.test(q)); }, addEventListener(_t: string, cb: any) { mqListeners.push(cb); }, removeEventListener(_t: string, cb: any) { const i = mqListeners.indexOf(cb); if (i >= 0) mqListeners.splice(i, 1); } });
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

async function main() {
  const Rail = (await import("@/components/home/HorizontalRail")).default as any; const Fade = (await import("@/components/ui/ScrollFade")).default as any; const Group = (await import("@/components/footer/FooterGroup")).default as any;
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  // geometry a real browser would supply: four cards 280 wide with a 40 gap; the row shows 300
  const geometry = async (region: any, o: { client: number; whole: number }) => { Object.defineProperty(region, "clientWidth", { value: o.client, configurable: true }); Object.defineProperty(region, "scrollWidth", { value: o.whole, configurable: true }); [...region.children].forEach((c: any, i: number) => { c.getBoundingClientRect = () => ({ left: i * 320 - region.scrollLeft, width: 280, right: i * 320 - region.scrollLeft + 280, top: 0, bottom: 100, height: 100, x: 0, y: 0, toJSON() {} }); }); await act(async () => { w.dispatchEvent(new w.Event("resize")); }); await flush(); };
  const scrollTo = async (region: any, x: number) => { region.scrollLeft = x; await act(async () => { region.dispatchEvent(new w.Event("scroll")); }); await flush(); };
  const cards = [1, 2, 3, 4].map((n) => <div key={n}>card {n}</div>);
  // ===== the rail =====
  await mount(<Rail label="Experiences">{cards}</Rail>); let region = q('[role="region"]');
  t("RAIL (everything fits): no progress bar, no count, no buttons — nothing to scroll means nothing to explain; the screen-reader line says 'Experiences: 4 items' (there is no 'current' card when nothing scrolls — it used to wrongly say '4 of 4')", !q('button[aria-label="Experiences: next"]') && !qa("p").some((p: any) => / \/ 4/.test(p.textContent)) && qa('[aria-hidden="true"]').length === 0 && q('[aria-live="polite"]').textContent === "Experiences: 4 items");
  await geometry(region, { client: 300, whole: 1240 });
  const bar = () => qa('div[aria-hidden="true"] > span')[0] as any; const count = () => qa("p").find((p: any) => /\d \/ \d/.test(p.textContent))?.textContent; const live = () => q('[aria-live="polite"]').textContent;
  t("RAIL (more is hidden): a thin progress bar appears with a thumb sized to what is visible (300 of 1240 = 24.2%), at the start (left 0), with '1 / 4' beside it", !!bar() && Math.abs(parseFloat(bar().style.width) - (300 / 1240) * 100) < 0.01 && parseFloat(bar().style.left) === 0 && count() === "1 / 4" && live() === "Experiences: 1 of 4");
  await scrollTo(region, 320); t("RAIL (scrolled one card): '2 / 4', the thumb moved a quarter of the way (320 of 940 hidden = 34%), and the screen reader is told 'Experiences: 2 of 4'", count() === "2 / 4" && live() === "Experiences: 2 of 4" && Math.abs(parseFloat(bar().style.left) - (320 / 940) * (1 - 300 / 1240) * 100) < 0.05);
  await scrollTo(region, 940); t("RAIL (at the end): '4 / 4' — even though the last card is reached before the third's middle passes — the thumb is at the far end, and the screen reader hears 'Experiences: 4 of 4'", count() === "4 / 4" && live() === "Experiences: 4 of 4" && Math.abs(parseFloat(bar().style.left) + parseFloat(bar().style.width) - 100) < 0.05);
  const prev = () => q('button[aria-label="Experiences: previous"]'), next = () => q('button[aria-label="Experiences: next"]'); let scrolled: any[] = []; region.scrollBy = (o: any) => scrolled.push(o);
  t("RAIL (buttons): at the end 'next' is disabled and 'previous' is enabled; at the start the reverse", next().disabled === true && prev().disabled === false && (await scrollTo(region, 0), prev().disabled === true && next().disabled === false));
  await click(next()); reduced = true; await click(next()); reduced = false; t("RAIL (buttons): 'next' scrolls 80% of the row (240 px), smoothly — or with no animation when the person asked for reduced motion", scrolled.length === 2 && scrolled[0].left === 240 && scrolled[0].behavior === "smooth" && scrolled[1].behavior === "auto");
  t("RAIL (accessibility): the row is a labelled region that can be focused and scrolled with the keyboard; the bar and the count are hidden from screen readers (they hear the one live line instead); the live line is polite", region.getAttribute("aria-label") === "Experiences" && region.getAttribute("tabindex") === "0" && bar().parentElement.getAttribute("aria-hidden") === "true" && qa("p").find((p: any) => / \/ 4/.test(p.textContent)).getAttribute("aria-hidden") === "true" && q('[aria-live="polite"]').className.includes("sr-only"));
  await mount(<Rail label="Stories"><div>one</div></Rail>); region = q('[role="region"]'); await geometry(region, { client: 300, whole: 900 }); t("RAIL (a single card): never shows '2 / 1' or breaks — the count stays within 1 to the total", count() === "1 / 1" && live() === "Stories: 1 of 1" || (count() === undefined && live() === "Stories: 1 item"));
  // ===== the fade wrapper =====
  await mount(<Fade as="nav" aria-label="Filter stories" className="chips"><a href="/a">A</a><a href="/b">B</a></Fade>); const nav = q("nav");
  t("FADE WRAPPER: renders the element it was asked for (nav), keeps its class, its label and its children, and links stay links", nav.tagName === "NAV" && nav.className === "chips" && nav.getAttribute("aria-label") === "Filter stories" && qa("nav a").length === 2);
  await mount(<Fade as="ul" role="list" className="x"><li>1</li></Fade>); t("FADE WRAPPER: can also be a list or a plain div, with a role passed through", q("ul")?.getAttribute("role") === "list" && (await mount(<Fade className="y">z</Fade>), q("#root > div")?.className === "y"));
  // ===== the footer groups =====
  const mountGroups = async () => mount(<div><Group title="Explore"><li><a href="/discover">Discover</a></li></Group><Group title="Plan &amp; join"><li><a href="/plan">Plan</a></li></Group></div>);
  phone = false; await mountGroups();
  t("FOOTER GROUPS (laptop or tablet): plain headings and open lists — no buttons, nothing hidden", qa("button").length === 0 && qa("h2").length === 2 && qa("ul").every((u: any) => !u.hidden && !u.hasAttribute("hidden")) && qa("a").length === 2);
  phone = true; await mountGroups();
  t("FOOTER GROUPS (phone): each heading becomes a button inside the h2, closed to start (aria-expanded=false), its list hidden — and the button controls that list", qa("h2 > button").length === 2 && qa("h2 > button").every((b: any) => b.getAttribute("aria-expanded") === "false") && qa("ul").every((u: any) => u.hasAttribute("hidden")) && qa("h2 > button").every((b: any) => !!b.getAttribute("aria-controls") && q('[id="' + b.getAttribute("aria-controls") + '"]')?.tagName === "UL"));
  const b0 = () => qa("h2 > button")[0] as any, b1 = () => qa("h2 > button")[1] as any;
  await click(b0()); t("FOOTER GROUPS (phone): tapping a heading opens just that group (aria-expanded=true, list shown); the other stays closed", b0().getAttribute("aria-expanded") === "true" && !qa("ul")[0].hasAttribute("hidden") && b1().getAttribute("aria-expanded") === "false" && qa("ul")[1].hasAttribute("hidden"));
  await click(b0()); t("FOOTER GROUPS (phone): tapping again closes it", b0().getAttribute("aria-expanded") === "false" && qa("ul")[0].hasAttribute("hidden"));
  t("FOOTER GROUPS (touch size): the heading buttons are at least 52 px tall (min-h-[52px]) and focusable like any button", qa("h2 > button").every((b: any) => /min-h-\[52px\]/.test(b.className) && /focus-ring/.test(b.className)));
  await click(b1()); phone = false; await act(async () => { mqListeners.forEach((cb) => cb()); }); await flush();
  t("FOOTER GROUPS (a phone turned sideways, or resized wide): they go back to plain headings and open lists at once, with no button left behind", qa("button").length === 0 && qa("ul").every((u: any) => !u.hasAttribute("hidden")));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} ROW AND FOOTER BROWSER CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
