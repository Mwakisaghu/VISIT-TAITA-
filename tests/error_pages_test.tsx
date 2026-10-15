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
const Mod = require("module"); const prevLoad = Mod._load;
Mod._load = function (r: string, ...x: any[]) { if (r === "next/headers") return { headers: () => new Headers({ "x-taita-locale": (globalThis as any).__loc ?? "en" }) }; return prevLoad.call(this, r, ...x); };
import { renderToStaticMarkup } from "react-dom/server";
const txt = (h: string) => h.replace(/<[^>]*>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
async function main() {
  const ErrorPage = (await import("@/app/error")).default as any; const Global = (await import("@/app/global-error")).default as any; const NotFound = (await import("@/app/not-found")).default as any; const { LocaleProvider } = await import("@/lib/i18n/client");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const secret = new Error("connect ECONNREFUSED 10.0.0.5:5432 password=hunter2") as Error & { digest?: string }; secret.digest = "4821903657"; let resets = 0; const origErr = console.error; const logged: any[] = []; console.error = (...a: any[]) => { logged.push(a); };
  await mount(<LocaleProvider locale="en"><ErrorPage error={secret} reset={() => { resets++; }} /></LocaleProvider>); await flush(); const root = q("#root").textContent;
  t("ERROR PAGE (what people see): a plain apology, what to do next, a 'Try again' button and a way home — a single alert, one heading, focus moved to the heading so a screen reader announces it", /Something went wrong on our side\./.test(root) && /Please try again, or go back to the home page/.test(root) && q('[role="alert"]') && qa("h1").length === 1 && w.document.activeElement === q("h1") && qa("button").length === 1 && q("a").getAttribute("href") === "/" && /Back to Visit Taita/.test(q("a").textContent));
  t("🔒 ERROR PAGE (never leaks): the technical message — here a database address and a password — is NOT shown anywhere on the page, only a short reference code that lets you find it in the logs; the full error goes to the log, not the screen", !/ECONNREFUSED|hunter2|10\.0\.0\.5|password/.test(q("#root").innerHTML) && /Reference: 4821903657/.test(root) && logged.some((a) => a[0] === secret));
  await click(q("button")); t("ERROR PAGE ('Try again'): runs the retry", resets === 1);
  await mount(<LocaleProvider locale="en"><ErrorPage error={new Error("x")} reset={() => {}} /></LocaleProvider>); await flush(); t("ERROR PAGE (no code): with no reference code, none is shown", !/Reference/.test(q("#root").textContent));
  await mount(<LocaleProvider locale="sw"><ErrorPage error={secret} reset={() => {}} /></LocaleProvider>); await flush();
  t("ERROR PAGE (Kiswahili): heading, message, buttons, reference and the way home are in Kiswahili, and the way home keeps '/sw'", /Hitilafu imetokea upande wetu\./.test(q("#root").textContent) && /Jaribu tena/.test(q("button").textContent) && /Rejea: 4821903657/.test(q("#root").textContent) && q("a").getAttribute("href") === "/sw" && /Rudi Visit Taita/.test(q("a").textContent));
  for (const [l, h, b] of [["fr", "Un problème est survenu de notre côté.", "Réessayer"], ["de", "Bei uns ist etwas schiefgelaufen.", "Erneut versuchen"]] as const) { await mount(<LocaleProvider locale={l}><ErrorPage error={secret} reset={() => {}} /></LocaleProvider>); await flush(); t(`ERROR PAGE (${l}): translated, and the way home keeps '/${l}'`, q("#root").textContent.includes(h) && q("button").textContent.includes(b) && q("a").getAttribute("href") === "/" + l); }
  const cls = [...fs.readFileSync("app/error.tsx", "utf8").matchAll(/className="([^"]*)"/g)].map((m) => m[1]).join(" ") + fs.readFileSync("app/not-found.tsx", "utf8");
  t("ERROR AND 404 PAGES (readable and tappable): no faint text (nothing fainter than 70%), buttons and links at least 44 px tall", !/text-stone\/(30|40|50|60|65)\b/.test(cls) && (cls.match(/min-h-\[44px\]/g) ?? []).length >= 3);
  console.error = origErr;
  const g = renderToStaticMarkup(<Global error={secret} reset={() => {}} />);
  t("LAST-RESORT PAGE: it is a complete page of its own (html with a language, body, one main alert and one heading), has a retry button and the reference code, carries its own styles, and again shows no technical message", /^<html lang="en">/.test(g) && /<body/.test(g) && (g.match(/<main/g) ?? []).length === 1 && (g.match(/<h1/g) ?? []).length === 1 && /<button/.test(g) && /Reference: 4821903657/.test(g) && /style="/.test(g) && !/ECONNREFUSED|hunter2|password/.test(g) && !/className/.test(fs.readFileSync("app/global-error.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "")));
  (globalThis as any).__loc = "en"; const n = renderToStaticMarkup(NotFound()); (globalThis as any).__loc = "sw"; const ns = renderToStaticMarkup(NotFound());
  t("404 PAGE: a real heading (it was a paragraph), a helpful sentence and a way home; in Kiswahili the words and the link are Kiswahili ('/sw'); no faint text", /<h1[^>]*>This trail ends here\.<\/h1>/.test(n) && /hasn't been mapped yet|hasn&#x27;t been mapped yet/.test(n) && /href="\/"/.test(n) && /<h1[^>]*>Njia hii inaishia hapa\.<\/h1>/.test(ns) && /href="\/sw"/.test(ns) && /Rudi Visit Taita/.test(ns) && !/text-stone\/60/.test(n));
  const dir = fs.readdirSync("app"); t("WIRING: the app has its own error page, last-resort page and 404 (these three files exist in the app folder)", ["error.tsx", "global-error.tsx", "not-found.tsx"].every((f) => dir.includes(f)));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} ERROR PAGE CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
