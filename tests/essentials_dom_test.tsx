import React from "react"; (globalThis as any).React = React;
const { JSDOM } = require("jsdom"); const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: "https://visittaita.example/essentials", pretendToBeVisual: true }); const w = dom.window as any;
Object.assign(globalThis, { window: w, document: w.document, HTMLElement: w.HTMLElement, Node: w.Node, Event: w.Event }); Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true, writable: true }); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const Module = require("module"); const origLoad = Module._load;
Module._load = function (r: string, ...x: any[]) { if (r === "next/navigation") return { usePathname: () => "/essentials", useRouter: () => ({ push() {}, refresh() {} }) }; return origLoad.call(this, r, ...x); };
// a controllable clock: `new Date()` says the 15th of the chosen month, 2026; anything with arguments is untouched
const RealDate = Date; let month: number | null = null;
(globalThis as any).Date = class extends RealDate { constructor(...a: any[]) { if (a.length === 0 && month !== null) super(2026, month, 15, 12); else super(...(a as [any])); } static now() { return month !== null ? new RealDate(2026, month, 15, 12).getTime() : RealDate.now(); } } as any;
const { createRoot } = require("react-dom/client"); const { act } = require("react");
let root: any; const unmount = async () => { if (root) { await act(async () => root.unmount()); root = null; } };
const mount = async (el: any) => { await unmount(); w.document.body.innerHTML = '<div id="root"></div>'; root = createRoot(w.document.getElementById("root")); await act(async () => root.render(el)); };
const $$ = (s: string) => Array.from(w.document.querySelectorAll(s)) as any[]; const $ = (s: string) => w.document.querySelector(s) as any;
const click = async (el: any) => { await act(async () => { el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true })); }); };
const norm = (s: string) => (s ?? "").replace(/\s+/g, " ").trim();
async function main() {
  const MonthStrip = (await import("@/components/essentials/MonthStrip")).default as any; const Nav = (await import("@/components/essentials/EssentialsNav")).default as any; const { LocaleProvider } = await import("@/lib/i18n/client"); const C: any = await import("@/app/essentials/content");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const months = Array.from({ length: 12 }, (_, m) => ({ name: new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, m, 1))), short: new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, m, 1))), season: C.SEASON_BY_MONTH[m] }));
  const seasons = { dry: { title: "Dry seasons", body: "DRY-TEXT" }, long: { title: "Long rains", body: "LONG-TEXT" }, short: { title: "Short rains", body: "SHORT-TEXT" } };
  const strip = () => React.createElement(LocaleProvider, { locale: "en" }, React.createElement(MonthStrip, { months, seasons }));
  const buttons = () => $$('ol[aria-label="Months of the year"] button'); const panel = () => $('[aria-label="About this month"]');
  month = 9; await mount(strip());
  const nowBadges = $$("ol span").filter((e) => norm(e.textContent) === "Now"); const cur = buttons().filter((b) => b.getAttribute("aria-current") === "date");
  t("TODAY IS MARKED ONCE THE PAGE IS IN THE BROWSER: with the clock on 15 October exactly one 'Now' badge appears, on the October button (which is also the one marked as the current date for a screen reader), and an 'About this month' panel opens for it: the month's name, 'This month', and BOTH what the page says of the dry season and of the short rains (October is the end of one and the start of the other)", buttons().length === 12 && nowBadges.length === 1 && nowBadges[0].closest("li") === buttons()[9].closest("li") && cur.length === 1 && cur[0] === buttons()[9] && /^October · This month/.test(norm(panel()?.textContent)) && /Dry seasons\. DRY-TEXT/.test(norm(panel().textContent)) && /Short rains\. SHORT-TEXT/.test(norm(panel().textContent)) && !/LONG-TEXT/.test(norm(panel().textContent)));
  month = 2; await mount(strip());
  t("…AND IT FOLLOWS THE CLOCK: on 15 March the badge moves to March and the panel tells only the long-rains story", $$("ol span").filter((e) => norm(e.textContent) === "Now").length === 1 && buttons()[2].getAttribute("aria-current") === "date" && buttons()[9].getAttribute("aria-current") === null && /^March · This month/.test(norm(panel().textContent)) && /Long rains\. LONG-TEXT/.test(norm(panel().textContent)) && !/DRY-TEXT|SHORT-TEXT/.test(norm(panel().textContent)));
  month = 9; await mount(strip()); await click(buttons()[5]);
  const afterPick = { pressed: buttons().filter((b) => b.getAttribute("aria-pressed") === "true"), text: norm(panel().textContent) };
  await click(buttons()[5]); const afterUnpick = { pressed: buttons().filter((b) => b.getAttribute("aria-pressed") === "true"), text: norm(panel().textContent) };
  t("TAPPING A MONTH SHOWS WHAT IT IS LIKE (how someone planning for June compares it with now): June becomes the only pressed button, its panel says June with no 'This month' and only the dry season, 'Now' stays where it was; tapping it again returns to the current month", afterPick.pressed.length === 1 && afterPick.pressed[0] === buttons()[5] && /^June(?! · This month)/.test(afterPick.text) && /DRY-TEXT/.test(afterPick.text) && !/SHORT-TEXT/.test(afterPick.text) && $$("ol span").filter((e) => norm(e.textContent) === "Now").length === 1 && /^October · This month/.test(afterUnpick.text) && afterUnpick.pressed.length === 1 && afterUnpick.pressed[0] === buttons()[9]);
  t("EVERY MONTH IS A REAL BUTTON a keyboard reaches, with the full name and season for a screen reader (the short name on screen is hidden from it so it is not read twice)", buttons().every((b) => b.tagName === "BUTTON" && b.getAttribute("type") === "button" && b.querySelector('span[aria-hidden="true"]') && /^[A-Z][a-z]+: /.test(norm(b.querySelector(".sr-only")?.textContent))));
  // ===== the jump bar follows the reader =====
  const sections = [{ id: "getting-here", label: "Getting here" }, { id: "when-to-go", label: "When to go" }, { id: "money", label: "Money" }, { id: "staying-safe", label: "Staying safe" }];
  let cb: any = null; let observed: string[] = []; let disconnected = 0;
  (globalThis as any).IntersectionObserver = class { constructor(c: any) { cb = c; } observe(el: any) { observed.push(el.id); } disconnect() { disconnected++; } unobserve() {} };
  w.document.body.innerHTML = '<div id="root"></div>' + sections.map((s) => `<section id="${s.id}"></section>`).join(""); root = null;
  root = createRoot(w.document.getElementById("root")); await act(async () => root.render(React.createElement(LocaleProvider, { locale: "fr" }, React.createElement(Nav, { sections }))));
  const links = () => $$('#root nav a') /* the label is translated, so find the bar by its shape */; const current = () => links().filter((a) => a.getAttribute("aria-current") === "true").map((a) => norm(a.textContent));
  const first = current();
  await act(async () => { cb([{ target: w.document.getElementById("money"), isIntersecting: true, intersectionRatio: 0.6 }, { target: w.document.getElementById("getting-here"), isIntersecting: false, intersectionRatio: 0 }]); });
  const second = current();
  await act(async () => { cb([{ target: w.document.getElementById("staying-safe"), isIntersecting: true, intersectionRatio: 0.9 }, { target: w.document.getElementById("money"), isIntersecting: true, intersectionRatio: 0.2 }]); });
  const third = current();
  t("THE JUMP BAR FOLLOWS THE READER: it watches all four sections, starts on the first, moves to the section most on screen as the visitor scrolls (Money, then Staying safe), keeps real links to each, and stops watching when the page is left", observed.join() === "getting-here,when-to-go,money,staying-safe" && first.join() === "Getting here" && second.join() === "Money" && third.join() === "Staying safe" && links().map((a) => a.getAttribute("href")).join() === "#getting-here,#when-to-go,#money,#staying-safe");
  const planLink = $$("a").find((a) => /\/plan$/.test(a.getAttribute("href") ?? ""));
  await unmount(); 
  t("…AND ITS PLAN BUTTON KEEPS THE VISITOR'S LANGUAGE (French: /fr/plan), and the scroll-watch is switched off when the bar goes away", !!planLink && planLink.getAttribute("href") === "/fr/plan" && disconnected >= 1);
  delete (globalThis as any).IntersectionObserver; observed = [];
  w.document.body.innerHTML = '<div id="root"></div>'; root = createRoot(w.document.getElementById("root")); let crashed = false; try { await act(async () => root.render(React.createElement(LocaleProvider, { locale: "en" }, React.createElement(Nav, { sections })))); } catch { crashed = true; }
  t("AN OLD BROWSER WITHOUT SCROLL-WATCHING STILL GETS THE BAR (the links work, the first is marked, nothing breaks)", !crashed && links().length === 4 && current().join() === "Getting here");
  await unmount(); let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} ESSENTIALS BROWSER CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
