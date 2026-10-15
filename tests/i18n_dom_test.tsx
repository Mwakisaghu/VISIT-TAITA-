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

Object.defineProperty(globalThis, "localStorage", { value: w.localStorage, configurable: true, writable: true });
Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true, writable: true });
Object.defineProperty(globalThis, "document", { value: w.document, configurable: true, writable: true });
async function main() {
  const Nav = (await import("@/components/Nav")).default as any; const { LocaleProvider } = await import("@/lib/i18n/client"); const { default: Banner, bannerNav } = await import("@/components/i18n/LanguageBanner"); const C = await import("@/lib/i18n/config");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const dest: string[] = []; bannerNav.to = (u: string) => { dest.push(u); };
  const setLangs = (l: string[]) => Object.defineProperty(w.navigator, "languages", { value: l, configurable: true });
  const where = (p: string) => w.history.pushState({}, "", p);
  const showNav = async (locale: string, path: string) => { pathname = path; where(path); await mount(<LocaleProvider locale={locale as "en"}><Nav /></LocaleProvider>); await flush(); };
  const mainLinks = () => qa('nav[aria-label] a').filter((a: any) => a.closest("nav").getAttribute("aria-label") !== "").map((a: any) => a);
  // ===== the navigation =====
  await showNav("en", "/stay");
  { const c: Record<string, boolean> = { labels: qa('nav a').map((a: any) => a.textContent).join() === "Discover,Stay,Experiences,Stories,Events,Shop,Plan", hrefs: qa('nav a').map((a: any) => a.getAttribute("href")).join() === "/discover,/stay,/experiences,/stories,/events,/shop,/plan", search: !!q('a[aria-label="Search"]'), account: !!q('button[aria-label="Account"]'), home: q('a[aria-label="Visit Taita — home"]')?.getAttribute("href") === "/", code: q('button[aria-controls="language-menu"]')?.textContent?.toUpperCase() === "EN", lab: q('button[aria-controls="language-menu"]')?.getAttribute("aria-label") === "Language: English" }; const bad = Object.entries(c).filter(([, v]) => !v).map(([k]) => k); t("NAV (English): exactly as before — the seven labels, their plain addresses, the English names for search, account and home, and the language button says 'EN'" + (bad.length ? " — FAILING: " + bad.join(",") + " | got labels: " + qa('nav a').map((a: any) => a.textContent).join() + " | hrefs: " + qa('nav a').map((a: any) => a.getAttribute("href")).join() : ""), bad.length === 0); }
  await showNav("sw", "/sw/stay");
  { const c: Record<string, boolean> = { labels: qa('nav a').map((a: any) => a.textContent).join() === "Gundua,Malazi,Uzoefu,Hadithi,Matukio,Duka,Mpango", hrefs: qa('nav a').map((a: any) => a.getAttribute("href")).join() === "/sw/discover,/sw/stay,/sw/experiences,/sw/stories,/sw/events,/sw/shop,/sw/plan", search: !!q('a[aria-label="Tafuta"]'), account: !!q('button[aria-label="Akaunti"]'), home: q('a[aria-label="Visit Taita — nyumbani"]')?.getAttribute("href") === "/sw", skip: q('a[href="#main"]')?.textContent === "Ruka hadi maudhui", current: q('nav a[href="/sw/stay"]')?.getAttribute("aria-current") === "page", notCurrent: !q('nav a[href="/sw/events"]')?.hasAttribute("aria-current"), code: q('button[aria-controls="language-menu"]')?.textContent?.toUpperCase() === "SW", lab: q('button[aria-controls="language-menu"]')?.getAttribute("aria-label") === "Lugha: Kiswahili" }; const bad = Object.entries(c).filter(([, v]) => !v).map(([k]) => k); t("NAV (Kiswahili): the labels, the logo's name, search, account and the skip link are in Kiswahili; every link goes to the /sw/ address; the page you are on (/sw/stay) is still marked as current, and the language button says SW" + (bad.length ? " — FAILING: " + bad.join(",") + " | got labels: " + qa('nav a').map((a: any) => a.textContent).join() : ""), bad.length === 0); }
  await showNav("fr", "/fr/events"); const frL = qa('nav a').map((a: any) => a.textContent).join(); await showNav("de", "/de"); const deL = qa('nav a').map((a: any) => a.textContent).join();
  t("NAV (French and German): their own labels, and the home page ('/de') counts as the home page (the header floats over the hero there, as in English)", frL === "Découvrir,Séjourner,Expériences,Histoires,Événements,Boutique,Planifier" && deL === "Entdecken,Unterkunft,Erlebnisse,Geschichten,Veranstaltungen,Shop,Planen" && /fixed/.test(q("header").className));
  await showNav("sw", "/sw/stay"); await click(q('button[aria-controls="mobile-menu"]'));
  t("NAV (phone menu, Kiswahili): the big links are Kiswahili and localised; the smaller ones (Ramani, Pasipoti, Tafuta, Ingia, Fungua akaunti) too; and a 'Lugha' row lists the four languages", qa("#mobile-menu nav a").map((a: any) => a.textContent).join() === "Gundua,Malazi,Uzoefu,Hadithi,Matukio,Duka,Mpango" && ["Ramani", "Pasipoti", "Tafuta", "Ingia", "Fungua akaunti"].every((l) => qa("#mobile-menu a").some((a: any) => a.textContent === l)) && /Lugha/.test(q("#mobile-menu").textContent) && qa('#mobile-menu ul[aria-label="Lugha"] a').length === 4 && q('#mobile-menu a[href="/sw/map"]'));
  await click(q('#mobile-menu ul[aria-label="Lugha"] a')); t("NAV (phone menu): choosing a language closes the menu", !q("#mobile-menu"));
  // ===== the switcher =====
  await showNav("sw", "/sw/stay"); where("/sw/stay?x=1#a"); await act(async () => { w.dispatchEvent(new w.Event("popstate")); }); await flush();
  t("SWITCHER (closed): a globe button that says it is a menu (aria-expanded=false, controls the list); nothing is shown until it is pressed", q('button[aria-controls="language-menu"]').getAttribute("aria-expanded") === "false" && !q("#language-menu") && !!q('button[aria-controls="language-menu"] svg[aria-hidden="true"]'));
  await click(q('button[aria-controls="language-menu"]')); const links = qa("#language-menu a") as any[]; const by = (n: string) => links.find((a: any) => a.textContent === n);
  t("SWITCHER (open): each language in its OWN name (English, Kiswahili, Français, Deutsch), as a real link with hreflang and lang; the page you are on (with its ?query and #section) is where each goes; the current language is marked", links.map((a: any) => a.textContent).join() === "English,Kiswahili,Français,Deutsch" && ["en", "sw", "fr", "de"].every((c, i) => links[i].getAttribute("hreflang") === c && links[i].getAttribute("lang") === c) && by("Kiswahili").getAttribute("href") === "/sw/stay?x=1#a" && by("Français").getAttribute("href") === "/fr/stay?x=1#a" && by("Deutsch").getAttribute("href") === "/de/stay?x=1#a" && by("Kiswahili").getAttribute("aria-current") === "true" && !by("English").hasAttribute("aria-current") && q('button[aria-controls="language-menu"]').getAttribute("aria-expanded") === "true");
  t("SWITCHER (English is explicit): the English link goes through '/en/…' so that choosing English really clears an earlier choice of Kiswahili (a plain '/stay' would be sent straight back to '/sw/stay')", by("English").getAttribute("href") === "/en/stay?x=1#a" && C.splitLocale(by("English").getAttribute("href")).locale === "en");
  t("SWITCHER (no flags, no country names): the list contains no flag characters and no country names", !/[\u{1F1E6}-\u{1F1FF}]/u.test(q("#language-menu").textContent) && !/Kenya|Tanzania|France|Germany|Deutschland/.test(q("#language-menu").textContent));
  await act(async () => { w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); }); await flush();
  t("SWITCHER (Escape): closes the list and puts focus back on the globe button", !q("#language-menu") && w.document.activeElement === q('button[aria-controls="language-menu"]'));
  await click(q('button[aria-controls="language-menu"]')); await act(async () => { w.document.body.dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true })); }); await flush(); t("SWITCHER (click elsewhere): closes", !q("#language-menu"));
  await showNav("en", "/"); where("/"); await click(q('button[aria-controls="language-menu"]')); const home = qa("#language-menu a") as any[];
  t("SWITCHER (the home page): '/' becomes '/sw', '/fr', '/de' and '/en' is just '/en'", home.map((a: any) => a.getAttribute("href")).join() === "/en,/sw,/fr,/de");
  // ===== the offer =====
  const LS = (k: string) => w.localStorage.getItem(k); const reset = () => { w.localStorage.clear(); w.document.cookie = "taita-lang=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"; dest.length = 0; };
  const banner = async (locale: string, path: string, langs: string[], o: any = {}) => { reset(); if (o.cookie) w.document.cookie = "taita-lang=" + o.cookie + "; path=/"; if (o.choice) w.localStorage.setItem("taita-lang-choice", String(o.choice)); setLangs(langs); pathname = path; where(path); await mount(<LocaleProvider locale={locale as "en"}><Banner /></LocaleProvider>); await flush(); };
  await banner("en", "/stay", ["sw-KE", "en"]);
  t("OFFER (Kiswahili): a visitor whose browser lists Kiswahili first is asked, IN Kiswahili, 'Ungependa kuendelea kwa Kiswahili?' with two buttons — 'Endelea kwa Kiswahili' and 'Hapana, asante'; it is a labelled region marked lang=sw, not a pop-up (no dialog, nothing blocked)", /Ungependa kuendelea kwa Kiswahili\?/.test(q("#root").textContent) && qa("button").map((b: any) => b.textContent).join() === "Endelea kwa Kiswahili,Hapana, asante" && q('[role="region"]').getAttribute("lang") === "sw" && q('[role="region"]').getAttribute("aria-label") === "Lugha" && !q("dialog") && !q('[aria-modal]'));
  t("OFFER (never without a click): showing the offer changes nothing — the address is not changed and nothing is navigated to until the person presses a button", dest.length === 0 && !LS("taita-lang-choice") && w.location.pathname === "/stay");
  await banner("en", "/stay", ["fr-CH", "de"]); const fr = q("#root").textContent; await banner("en", "/stay", ["de-AT"]); const de = q("#root").textContent;
  t("OFFER (French, German): in their own language too ('Souhaitez-vous continuer en Français ?', 'Möchtest du auf Deutsch weiterlesen?')", /Souhaitez-vous continuer en Français \?/.test(fr) && /Continuer en Français/.test(fr) && /Non merci/.test(fr) && /Möchtest du auf Deutsch weiterlesen\?/.test(de) && /Weiter auf Deutsch/.test(de) && /Nein danke/.test(de));
  const none: [string, string, string[], any][] = [["someone who lists English first", "/stay", ["en-US", "sw"], {}], ["a browser with no match", "/stay", ["es", "pt"], {}], ["someone who already chose a language (the cookie)", "/stay", ["sw"], { cookie: "sw" }], ["someone who said no thanks yesterday", "/stay", ["sw"], { choice: Date.now() - 86_400_000 }], ["an admin address", "/admin/shop", ["sw"], {}], ["no languages at all", "/stay", [], {}]];
  const silent: string[] = []; for (const [what, p, langs, o] of none) { await banner("en", p, langs, o); if (q('[role="region"]')) silent.push(what); }
  t("OFFER (when it stays silent): nothing for someone who lists English first, a browser with no matching language, anyone who already chose (cookie), anyone who said 'No thanks' in the last six months, on admin addresses, or with no language list" + (silent.length ? " — ASKED ANYWAY: " + silent.join("; ") : ""), silent.length === 0);
  await banner("en", "/stay", ["sw"], { choice: Date.now() - 200 * 86_400_000 }); const again = !!q('[role="region"]'); await banner("sw", "/sw/stay", ["sw"]); const same = !!q('[role="region"]');
  t("OFFER (timing and the language already shown): 'No thanks' is remembered for six months, then it may ask again; no offer for a language already on screen", again && !same);
  await banner("en", "/stay", ["sw"]); where("/stay?x=1#a"); await click(qa("button").find((b: any) => /Endelea/.test(b.textContent)));
  t("OFFER (accept): goes to the Kiswahili address of the SAME page (query and #section kept), and remembers that the question was answered", dest.join() === "/sw/stay?x=1#a" && Number(LS("taita-lang-choice")) > 0);
  await banner("en", "/", ["fr"]); await click(qa("button").find((b: any) => /Non merci/.test(b.textContent)));
  t("OFFER (decline): the banner goes away, nothing is navigated to, 'No thanks' is remembered; coming back later does not ask again", !q('[role="region"]') && dest.length === 0 && Number(LS("taita-lang-choice")) > 0 && (await (async () => { await mount(<LocaleProvider locale="en"><Banner /></LocaleProvider>); await flush(); return !q('[role="region"]'); })()));
  await banner("en", "/stay", ["de"]); const origGet = w.Storage.prototype.getItem; const origSet = w.Storage.prototype.setItem; w.Storage.prototype.getItem = () => { throw new Error("blocked"); }; w.Storage.prototype.setItem = () => { throw new Error("blocked"); }; let crashed = false; try { await banner("en", "/stay", ["de"]); await click(qa("button").find((b: any) => /Nein danke/.test(b.textContent))); } catch { crashed = true; } w.Storage.prototype.getItem = origGet; w.Storage.prototype.setItem = origSet;
  t("OFFER (private browsing): when the browser won't store anything it still works (it may simply ask again next visit) — no crash", !crashed);
  const bsrc = fs.readFileSync("components/i18n/LanguageBanner.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  t("OFFER (a design rule, checked in the code): the banner has no automatic navigation — the only place that navigates is the accept button; it uses the browser's own language LIST (never the visitor's location or IP)", (bsrc.match(/bannerNav\.to\(/g) ?? []).length === 1 && /const accept = \(\) =>[^;]*;[^;]*bannerNav\.to/.test(bsrc.replace(/\n/g, " ")) && !/geolocation|ipapi|country|timezone/i.test(bsrc) && /navigator\.languages/.test(bsrc));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} LANGUAGE BROWSER CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
