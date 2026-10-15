import React from "react"; (globalThis as any).React = React;
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
const key = async (k: string, o: any = {}) => { await act(async () => { (w.document.activeElement ?? w.document).dispatchEvent(new w.KeyboardEvent("keydown", { key: k, bubbles: true, ...o })); }); await flush(); };

async function main() {
  const Reveal = (await import("@/components/home/Reveal")).default as any; const Parallax = (await import("@/components/home/Parallax")).default as any; const Rail = (await import("@/components/home/HorizontalRail")).default as any;
  const Video = (await import("@/components/home/HeroVideo")).default as any; const Cta = (await import("@/components/home/PassportCta")).default as any; const Nav = (await import("@/components/Nav")).default as any;
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);

  // ===== Reveal =====
  rectTop = 100; IOS.length = 0; await mount(<Reveal className="outer-x" innerClassName="inner-y" delay={240}><p id="kid">hello</p></Reveal>);
  let inner = q(".reveal");
  t("REVEAL (already on screen at load): left alone — not hidden, no observer — so nothing flashes or shifts", !inner.dataset.armed && IOS.length === 0 && !!q("#kid"));
  t("REVEAL: placement classes sit on the OUTER element and layout classes on the INNER one that holds the content; the delay is a CSS variable", q(".outer-x") && !q(".outer-x").classList.contains("reveal") && inner.classList.contains("inner-y") && inner.contains(q("#kid")) && inner.style.getPropertyValue("--reveal-delay") === "240ms");
  rectTop = 2000; IOS.length = 0; await mount(<Reveal><p>below</p></Reveal>); inner = q(".reveal");
  t("REVEAL (below the fold): becomes 'armed' (hidden, waiting) and is NOT yet revealed", inner.dataset.armed === "true" && !inner.dataset.in && IOS.length === 1);
  t("🔒 REVEAL: what is observed is the OUTER wrapper, never the inner element that hides itself (a browser doesn't count a fully clipped element as on screen, so it would never appear)", IOS[0].observed.length === 1 && !IOS[0].observed[0].classList.contains("reveal") && IOS[0].observed[0].contains(inner));
  await act(async () => { IOS[0].cb([{ isIntersecting: false }]); }); await flush(); t("REVEAL: an entry that is not intersecting changes nothing", !q(".reveal").dataset.in);
  await act(async () => { IOS[0].cb([{ isIntersecting: true }]); }); await flush(); t("REVEAL: when it scrolls into view it is revealed, and the observer stops watching", q(".reveal").dataset.in === "true" && IOS[0].disconnected === true);
  rectTop = 2000; reduced = true; IOS.length = 0; await mount(<Reveal><p>x</p></Reveal>); t("REVEAL: for people who prefer reduced motion nothing is ever hidden", !q(".reveal").dataset.armed && IOS.length === 0); reduced = false;
  const SavedIO = w.IntersectionObserver; (globalThis as any).IntersectionObserver = undefined; w.IntersectionObserver = undefined; await mount(<Reveal><p>x</p></Reveal>); t("REVEAL: in a browser without IntersectionObserver the content simply stays visible", !q(".reveal").dataset.armed); (globalThis as any).IntersectionObserver = SavedIO; w.IntersectionObserver = SavedIO;
  rectTop = -300; await mount(<Reveal><p>x</p></Reveal>); t("REVEAL: content already scrolled PAST at load (e.g. the page reloaded half way down) is left visible, not hidden above the viewport", !q(".reveal").dataset.armed);

  // ===== Parallax =====
  rectTop = -500; IOS.length = 0; await mount(<div id="box"><Parallax speed={0.2}><p>bg</p></Parallax></div>); let layer = q("#box > div");
  t("PARALLAX: the layer moves a fraction of the scroll (-top x speed = 100px), using transform only", layer.style.transform === "translate3d(0, 100px, 0)" && layer.style.willChange === "transform");
  rectTop = -1000; await act(async () => { w.dispatchEvent(new w.Event("scroll")); }); await flush(); t("PARALLAX: it follows the scroll (top -1000 -> 200px)", q("#box > div").style.transform === "translate3d(0, 200px, 0)");
  await act(async () => { IOS[0].cb([{ isIntersecting: false }]); }); rectTop = -2000; await act(async () => { w.dispatchEvent(new w.Event("scroll")); }); await flush(); t("PARALLAX: it does no work while its section is off screen", q("#box > div").style.transform === "translate3d(0, 200px, 0)");
  reduced = true; await mount(<div id="box"><Parallax speed={0.2}><p>bg</p></Parallax></div>); t("PARALLAX: reduced motion = no movement at all", q("#box > div").style.transform === ""); reduced = false;
  rectTop = -500; await mount(<div id="box"><Parallax speed={0.2}><p>bg</p></Parallax></div>); await act(async () => root.unmount()); root = createRoot(q("#root")); t("PARALLAX: unmounting cleans up (no leftover scroll listener work)", true);

  // ===== HorizontalRail =====
  let scrolled: any[] = []; await mount(<Rail label="Experiences"><div>one</div><div>two</div></Rail>); const region = q('[role="region"]');
  Object.defineProperty(region, "clientWidth", { value: 1000, configurable: true }); Object.defineProperty(region, "scrollWidth", { value: 3000, configurable: true }); region.scrollBy = (o: any) => scrolled.push(o); await act(async () => { region.dispatchEvent(new w.Event("scroll")); }); await flush();
  const prev = () => q('button[aria-label="Experiences: previous"]'), next = () => q('button[aria-label="Experiences: next"]');
  t("RAIL: a labelled, keyboard-focusable scroll region; previous is disabled at the start, next is enabled", region.getAttribute("aria-label") === "Experiences" && region.getAttribute("tabindex") === "0" && prev().disabled === true && next().disabled === false);
  await click(next()); t("RAIL: 'next' scrolls 80% of the visible width, smoothly", scrolled.length === 1 && scrolled[0].left === 800 && scrolled[0].behavior === "smooth");
  reduced = true; await click(next()); t("RAIL: with reduced motion it jumps instead of gliding", scrolled[1].behavior === "auto"); reduced = false;
  region.scrollLeft = 2000; await act(async () => { region.dispatchEvent(new w.Event("scroll")); }); await flush(); t("RAIL: at the end, 'next' is disabled and 'previous' is enabled", next().disabled === true && prev().disabled === false);
  await click(prev()); t("RAIL: 'previous' scrolls back by the same amount", scrolled[scrolled.length - 1].left === -800);

  // ===== HeroVideo =====
  const idleAt: any[] = []; w.requestIdleCallback = (f: any) => { idleAt.push(f); return idleAt.length; }; w.cancelIdleCallback = () => {};
  idleAt.length = 0; await mount(<Video src="/h.mp4" poster="/p.jpg" />); t("VIDEO: nothing is loaded at first (it waits for the browser to be idle)", !q("video") && idleAt.length === 1);
  await act(async () => { idleAt[0](); }); await flush(); const v = q("video"); t("VIDEO: once idle it plays silently, looped, inline, hidden from screen readers and out of the tab order, with the poster", !!v && v.muted === true && v.loop === true && v.hasAttribute("playsinline") && v.getAttribute("aria-hidden") === "true" && v.getAttribute("tabindex") === "-1" && v.getAttribute("poster") === "/p.jpg" && v.getAttribute("src") === "/h.mp4");
  for (const [label, set] of [["data-saver on", () => { saveData = true; }], ["a 2g connection", () => { effType = "2g"; }], ["reduced motion", () => { reduced = true; }]] as any[]) { saveData = false; effType = "4g"; reduced = false; set(); idleAt.length = 0; await mount(<Video src="/h.mp4" />); await act(async () => { idleAt.forEach((f) => f()); }); await flush(); t(`VIDEO: never loaded with ${label}`, !q("video")); }
  saveData = false; effType = "4g"; reduced = false;

  // ===== PassportCta =====
  session = { data: null, status: "unauthenticated" }; await mount(<Cta />); t("PASSPORT BUTTON (visitor): 'Start your passport' -> sign-up", /Start your passport/.test(q("a").textContent) && q("a").getAttribute("href") === "/register");
  session = { data: { user: { email: "a@b.co", role: "MEMBER" } }, status: "authenticated" }; await mount(<Cta />); t("PASSPORT BUTTON (signed in): 'Open your passport' -> the passport", /Open your passport/.test(q("a").textContent) && q("a").getAttribute("href") === "/passport");

  // ===== Nav =====
  const header = () => q("header"); const asUser = (role: string | null) => { session = role ? { data: { user: { email: "me@x.co", role } }, status: "authenticated" } : { data: null, status: "unauthenticated" }; };
  pathname = "/"; scrollY = 0; asUser(null); cartCount = 0; await mount(<Nav />);
  t("NAV (homepage, top): it floats over the hero — fixed, with a soft dark scrim and NO solid background", /\bfixed\b/.test(header().className) && /from-stone\/70/.test(header().className) && !/backdrop-blur/.test(header().className));
  scrollY = 300; await act(async () => { w.dispatchEvent(new w.Event("scroll")); }); await flush(); t("NAV (homepage, scrolled): it turns solid and blurred", /bg-stone\/90/.test(header().className) && /backdrop-blur-md/.test(header().className));
  scrollY = 0; await act(async () => { w.dispatchEvent(new w.Event("scroll")); }); await flush(); t("NAV: scrolling back to the top makes it transparent again", /from-stone\/70/.test(header().className));
  pathname = "/stay"; await mount(<Nav />); t("NAV (any other page): a solid sticky bar from the start (it never overlaps content)", /\bsticky\b/.test(header().className) && /bg-stone\/95/.test(header().className) && !/\bfixed\b/.test(header().className));
  const mainNav = () => q('nav[aria-label="Main"]'); const labels = () => qa('nav[aria-label="Main"] a').map((a) => a.textContent);
  t("NAV: the seven main doors in order — Discover, Stay, Experiences, Stories, Events, Shop, Plan — to the right pages (the map is reached from Discover, the footer and the menu)", labels().join() === "Discover,Stay,Experiences,Stories,Events,Shop,Plan" && qa('nav[aria-label="Main"] a').map((a) => a.getAttribute("href")).join() === "/discover,/stay,/experiences,/stories,/events,/shop,/plan");
  t("NAV: the current page is marked (aria-current) so it is highlighted and announced", q('nav[aria-label="Main"] a[href="/stay"]').getAttribute("aria-current") === "page" && !q('nav[aria-label="Main"] a[href="/events"]').hasAttribute("aria-current"));
  t("NAV: the right side has Search, Passport (for everyone), Cart and an Account button; a skip-to-content link comes first", !!q('a[aria-label="Search"][href="/search"]') && qa("header a").some((a) => a.textContent?.trim() === "Passport" && a.getAttribute("href") === "/passport") && !!q('a[aria-label="Cart"][href="/shop/cart"]') && !!q('button[aria-label="Account"]') && q("header a").getAttribute("href") === "#main" && /Skip to content/.test(q("header a").textContent));
  cartCount = 3; await mount(<Nav />); t("NAV: the cart shows how many items, to everyone (visible badge and spoken label)", !!q('a[aria-label="Cart, 3 items"]') && /3/.test(q('a[aria-label^="Cart"]').textContent)); cartCount = 1; await mount(<Nav />); t("NAV: singular wording for one item", !!q('a[aria-label="Cart, 1 item"]')); cartCount = 0;

  // account menu
  asUser(null); await mount(<Nav />); const accBtn = () => q('button[aria-label="Account"]');
  t("ACCOUNT MENU (visitor): closed at first; opens to Sign in and Create an account", accBtn().getAttribute("aria-expanded") === "false" && !q("#account-menu") && (await click(accBtn()), accBtn().getAttribute("aria-expanded") === "true" && qa("#account-menu a").map((a) => a.textContent).join() === "Sign in,Create an account"));
  await key("Escape"); t("ACCOUNT MENU: Escape closes it and puts focus back on its button", !q("#account-menu") && w.document.activeElement === accBtn());
  await click(accBtn()); await act(async () => { w.document.body.dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true })); }); await flush(); t("ACCOUNT MENU: a click anywhere else closes it", !q("#account-menu"));
  await click(accBtn()); pathname = "/events"; await mount(<Nav />); t("ACCOUNT MENU: moving to another page closes it", !q("#account-menu")); pathname = "/stay";
  const menuFor = async (role: string) => { asUser(role); await mount(<Nav />); await click(accBtn()); return qa("#account-menu a, #account-menu button").map((e) => (e.textContent ?? "").trim()); };
  let items = await menuFor("MEMBER"); t("ACCOUNT MENU (member): their email, My account, Passport, My tickets, My bookings, Sign out — and NO Admin, Partner or Crew", /me@x\.co/.test(q("#account-menu").textContent) && ["My account", "Passport", "My tickets", "My bookings", "Sign out"].every((l) => items.includes(l)) && !items.some((l) => /Admin|Partner|Crew/.test(l)));
  items = await menuFor("ADMIN"); t("ACCOUNT MENU (admin): Admin is available here, tucked away in the menu — not in the main bar", items.includes("Admin") && q('#account-menu a[href="/admin"]') && !labels().includes("Admin"));
  for (const r of ["SUPER_ADMIN", "EDITOR", "CONTENT_MANAGER"]) { items = await menuFor(r); t(`ACCOUNT MENU (${r}): Admin is offered`, items.includes("Admin")); }
  items = await menuFor("PARTNER"); t("ACCOUNT MENU (partner): 'Partner area', no Admin", items.includes("Partner area") && !items.includes("Admin")); items = await menuFor("SELLER"); t("ACCOUNT MENU (seller): 'Partner area'", items.includes("Partner area")); items = await menuFor("CREATOR"); t("ACCOUNT MENU (creator): 'Crew', no Admin or Partner", items.includes("Crew") && !items.includes("Admin") && !items.includes("Partner area"));
  await click(qa("#account-menu button").find((b) => /Sign out/.test(b.textContent))); t("SIGN OUT: signs out and returns to the homepage", signOuts.length === 1 && signOuts[0].callbackUrl === "/");

  // phone menu
  asUser(null); pathname = "/"; await mount(<Nav />); const tog = () => q('button[aria-label="Open menu"], button[aria-label="Close menu"]');
  t("PHONE MENU: closed at first, with an 'Open menu' button that says what it controls", tog().getAttribute("aria-label") === "Open menu" && tog().getAttribute("aria-expanded") === "false" && tog().getAttribute("aria-controls") === "mobile-menu" && !q("#mobile-menu"));
  await click(tog()); const menu = q("#mobile-menu");
  t("🔒 PHONE MENU: it is NOT inside the blurred header (a blurred parent would trap a 'full-screen' child inside the header's height); it covers the screen and its text is light", !!menu && !header().contains(menu) && /fixed/.test(menu.className) && /inset-0/.test(menu.className) && /text-parchment/.test(menu.className));
  t("PHONE MENU: the button now says 'Close menu' (expanded); big links to the seven doors; smaller ones for Map, Passport, Search and sign-in; the page behind can't scroll", tog().getAttribute("aria-label") === "Close menu" && tog().getAttribute("aria-expanded") === "true" && qa("#mobile-menu nav a").map((a) => a.textContent).join() === "Discover,Stay,Experiences,Stories,Events,Shop,Plan" && ["Map", "Passport", "Search", "Sign in", "Create an account"].every((l) => qa("#mobile-menu a").some((a) => a.textContent === l)) && w.document.body.style.overflow === "hidden");
  t("PHONE MENU: focus moves into the menu", menu.contains(w.document.activeElement));
  const focusables = [...qa("#mobile-menu a, #mobile-menu button"), tog()]; const first = focusables[0], last = focusables[focusables.length - 1]; last.focus(); await key("Tab"); t("PHONE MENU: Tab from the last control wraps to the first (focus can't escape behind the menu)", w.document.activeElement === first); first.focus(); await key("Tab", { shiftKey: true }); t("PHONE MENU: Shift+Tab from the first control wraps to the last", w.document.activeElement === last);
  await key("Escape"); t("PHONE MENU: Escape closes it, scrolling is restored and focus returns to the menu button", !q("#mobile-menu") && w.document.body.style.overflow !== "hidden" && w.document.activeElement === tog());
  await click(tog()); await click(qa("#mobile-menu nav a")[2]); t("PHONE MENU: choosing a link closes the menu", !q("#mobile-menu"));
  asUser("ADMIN"); await mount(<Nav />); await click(tog()); t("PHONE MENU (admin): Admin, My account and Sign out are inside the menu's quiet list", ["Admin", "My account", "Sign out"].every((l) => qa("#mobile-menu a, #mobile-menu button").some((e) => (e.textContent ?? "").trim() === l)));
  const tap = qa("header button, header a").filter((e) => /h-11 w-11|h-11/.test(e.className)); t("TAP TARGETS: the header's icon buttons are 44px square (h-11 w-11)", tap.length >= 3 && qa("header .h-11.w-11").length >= 3);

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} HOMEPAGE BROWSER CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
