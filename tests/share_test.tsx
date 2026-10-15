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
async function main() {
  const S = await import("@/lib/share"); const { default: ShareBar, shareNav } = await import("@/components/share/ShareBar"); const { LocaleProvider } = await import("@/lib/i18n/client");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  t("TITLE: the site name tacked on the end is removed ('| Visit Taita', '— Visit Taita', '- Visit Taita'); a 'Visit Taita' in the middle stays; control characters and long titles are tamed; non-text is empty", S.cleanTitle("The Man-Eaters of Tsavo | Visit Taita") === "The Man-Eaters of Tsavo" && S.cleanTitle("Stay — Visit Taita") === "Stay" && S.cleanTitle("Stay - Visit Taita") === "Stay" && S.cleanTitle("Visit Taita Passport | Visit Taita") === "Visit Taita Passport" && S.cleanTitle("a\u0000b\n c") === "a b c" && S.cleanTitle("x".repeat(300)).length === 140 && S.cleanTitle("x".repeat(300)).endsWith("…") && [null, undefined, 5, {}].every((v: any) => S.cleanTitle(v) === ""));
  const base = "https://visittaita.example/sw/stories/the-man-eaters?utm_source=old&utm_campaign=x&page=2#credits-title";
  t("ADDRESS: it is the page's own address, with the language in front kept; the #section and old tracking are removed; other settings (page=2) stay; a channel adds a small tag (utm_source, utm_medium=share) so you can see where visits come from", S.shareUrl(base) === "https://visittaita.example/sw/stories/the-man-eaters?page=2" && S.shareUrl(base, { channel: "whatsapp" }) === "https://visittaita.example/sw/stories/the-man-eaters?page=2&utm_source=whatsapp&utm_medium=share" && !S.shareUrl(base, { channel: "whatsapp" })!.includes("utm_source=old") && !S.shareUrl(base)!.includes("#"));
  t("🔒 ADDRESS (only web pages): scripts, mail links, data, files and junk give nothing to share; a channel name with odd characters is ignored (never put in the address)", ["javascript:alert(1)", "mailto:a@b.c", "data:text/html,x", "file:///etc/passwd", "ftp://x.org/a", "not a url", "", "//x.org"].every((h) => S.shareUrl(h) === null) && S.shareUrl("https://v.example/a", { channel: "wh atsapp&x=1" }) === "https://v.example/a" && S.shareUrl("https://v.example/a", { channel: "x".repeat(21) }) === "https://v.example/a");
  t("ADDRESS (the real domain): when the site's address is set, shared links use it (so previews match the real site); a plain-http or invalid setting is ignored; the path and language stay", S.shareUrl("http://localhost:3000/fr/stay", { origin: "https://visittaita.example" }) === "https://visittaita.example/fr/stay" && S.shareUrl("https://a.example/fr/stay", { origin: "http://insecure.example" }) === "https://a.example/fr/stay" && S.shareUrl("https://a.example/fr/stay", { origin: "not a url" }) === "https://a.example/fr/stay" && S.shareUrl("https://a.example/x", { origin: null }) === "https://a.example/x");
  const wl = S.whatsappLink("Stay & see: Hill House, on Visit Taita", "https://v.example/stay?x=1&y=2"), fl = S.facebookLink("https://v.example/stay?x=1&y=2#z");
  t("LINKS: the WhatsApp message and address are encoded so '&', '?' and new lines survive (the message and the address on separate lines); the Facebook link carries the whole address encoded", wl.startsWith("https://wa.me/?text=") && decodeURIComponent(wl.split("text=")[1]) === "Stay & see: Hill House, on Visit Taita\nhttps://v.example/stay?x=1&y=2" && !wl.slice(20).includes("&y=2") && fl === "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent("https://v.example/stay?x=1&y=2#z") && !fl.slice(46).includes("&y="));
  // ===== the bar =====
  const opened: string[] = []; shareNav.open = (u: string) => { opened.push(u); };
  const shared: any[] = []; const setNative = (on: boolean) => { Object.defineProperty(w.navigator, "share", { value: on ? async (d: any) => { shared.push(d); } : undefined, configurable: true }); };
  let copied: string[] = []; let clipOk = true; Object.defineProperty(w.navigator, "clipboard", { value: { writeText: async (s: string) => { if (!clipOk) throw new Error("denied"); copied.push(s); } }, configurable: true }); let execOk = true; (w.document as any).execCommand = () => execOk;
  const go = async (path: string, title: string, locale = "en", native = false) => { w.history.pushState({}, "", path); w.document.title = title; setNative(native); opened.length = 0; copied = []; shared.length = 0; await mount(<LocaleProvider locale={locale as "en"}><ShareBar /></LocaleProvider>); await flush(); };
  const btn = (re: RegExp) => qa("button").find((b: any) => re.test(b.getAttribute("aria-label") ?? b.textContent)) as any;
  await go("/stories/the-man-eaters-of-tsavo?utm_source=old#credits-title", "The Man-Eaters of Tsavo | Visit Taita");
  t("BAR (a laptop): WhatsApp, Facebook and Copy link — three real buttons in a labelled group, each a 44 px target with a hidden decorative icon; no 'Share' button when the browser has no share sheet", qa("button").length === 3 && q('[role="group"]').getAttribute("aria-label") === "Share this page" && qa("button").every((b: any) => /min-h-\[44px\]/.test(b.className)) && qa("button svg").every((s: any) => s.getAttribute("aria-hidden") === "true") && !btn(/^Share$/));
  await click(btn(/WhatsApp/)); const waText = decodeURIComponent((opened[0] ?? "").split("text=")[1] ?? "");
  t("BAR (WhatsApp): opens WhatsApp with 'The Man-Eaters of Tsavo, on Visit Taita' and the page's own address on the next line — without the #section or the old tracking, with this channel's tag", /^https:\/\/wa\.me\/\?text=/.test(opened[0]) && waText.startsWith("The Man-Eaters of Tsavo, on Visit Taita\nhttp://localhost/stories/the-man-eaters-of-tsavo?utm_source=whatsapp&utm_medium=share") && !waText.includes("#") && !waText.includes("utm_source=old") && opened.length === 1);
  await click(btn(/Facebook/)); const fbUrl = decodeURIComponent((opened[1] ?? "").split("u=")[1] ?? "");
  t("BAR (Facebook): opens Facebook's share page for the same address, tagged for Facebook", /^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/.test(opened[1]) && fbUrl === "http://localhost/stories/the-man-eaters-of-tsavo?utm_source=facebook&utm_medium=share");
  await click(btn(/Copy link/)); await flush();
  t("BAR (copy link): copies the CLEAN address (no tracking tags: someone pasting a link into a message should get the tidy one), and says so in a polite live status", copied.join() === "http://localhost/stories/the-man-eaters-of-tsavo" && /Link copied/.test(q('[role="status"]').textContent) && q('[role="status"]').getAttribute("aria-live") === "polite");
  clipOk = false; execOk = true; await go("/stay", "Stay | Visit Taita"); await click(btn(/Copy link/)); await flush(); const viaFallback = q('[role="status"]').textContent; execOk = false; await go("/stay", "Stay | Visit Taita"); await click(btn(/Copy link/)); await flush(); const failed = q('[role="status"]').textContent; clipOk = true; execOk = true;
  t("BAR (copy link, when the browser says no): falls back to the older copy method; if that fails too, says 'Couldn't copy the link' — never silence", /Link copied/.test(viaFallback) && /Couldn't copy the link/.test(failed));
  await go("/events/taita-cup", "Taita Cup Final | Visit Taita", "en", true);
  t("BAR (a phone): a 'Share' button appears first when the browser has a share sheet; it passes the title, the message and the address tagged for the sheet, and closing the sheet without sharing is not an error", btn(/^Share$/) === qa("button")[0] && qa("button").length === 4);
  await click(btn(/^Share$/)); t("BAR (share sheet): the sheet is given the tidy title, the message and the tagged address", shared.length === 1 && shared[0].title === "Taita Cup Final" && shared[0].text === "Taita Cup Final, on Visit Taita" && shared[0].url === "http://localhost/events/taita-cup?utm_source=share&utm_medium=share");
  Object.defineProperty(w.navigator, "share", { value: async () => { throw new DOMException("cancelled", "AbortError"); }, configurable: true }); let threw = false; try { await click(btn(/^Share$/)); } catch { threw = true; } t("BAR (share sheet cancelled): no error", !threw);
  await go("/sw/stories/the-man-eaters-of-tsavo", "The Man-Eaters of Tsavo | Visit Taita", "sw", true);
  t("BAR (Kiswahili): the buttons, the group name and the message are in Kiswahili, and the shared address keeps '/sw/' so the person who receives it reads it in Kiswahili too", btn(/^Shiriki$/) && /Shiriki kwenye WhatsApp \(inafunguka kwenye kichupo kipya\)/.test(btn(/WhatsApp/).getAttribute("aria-label")) && /Nakili kiungo/.test(q("#root").textContent) && q('[role="group"]').getAttribute("aria-label") === "Shiriki ukurasa huu");
  await click(btn(/WhatsApp/)); const swText = decodeURIComponent(opened[0].split("text=")[1]);
  t("BAR (Kiswahili message): 'The Man-Eaters of Tsavo, kwenye Visit Taita' and a /sw/ address", swText.startsWith("The Man-Eaters of Tsavo, kwenye Visit Taita\nhttp://localhost/sw/stories/the-man-eaters-of-tsavo?utm_source=whatsapp"));
  for (const [l, label, msg] of [["fr", "Copier le lien", "sur Visit Taita"], ["de", "Link kopieren", "auf Visit Taita"]] as const) { await go(`/${l}/stay`, "Hill House | Visit Taita", l); await click(btn(/WhatsApp/)); t(`BAR (${l}): labels and message in the language ('${label}', '${msg}') and the ${l} address`, new RegExp(label).test(q("#root").textContent) && decodeURIComponent(opened[0].split("text=")[1]).includes(msg) && decodeURIComponent(opened[0]).includes(`/${l}/stay`)); }
  await go("/stay", "Stay | Visit Taita"); process.env.NEXT_PUBLIC_APP_URL = "https://visittaita.example"; await click(btn(/Copy link/)); await flush(); const withOrigin = copied[0]; process.env.NEXT_PUBLIC_APP_URL = "http://insecure.example"; await click(btn(/Copy link/)); await flush(); const withHttp = copied[1]; delete process.env.NEXT_PUBLIC_APP_URL;
  t("BAR (the real domain): with the site address set the copied link uses it; an insecure (http) setting is ignored", withOrigin === "https://visittaita.example/stay" && withHttp === "http://localhost/stay");
  const pages = ["app/stories/[slug]/page.tsx", "app/experiences/listing/[slug]/page.tsx", "app/stay/listing/[slug]/page.tsx", "app/events/[slug]/page.tsx", "app/shop/makers/[slug]/page.tsx"].map((f) => fs.readFileSync(f, "utf8"));
  t("WHERE IT APPEARS: under the heading of every story, experience, stay, event and maker page — exactly once each", pages.every((p) => (p.match(/<ShareBar/g) ?? []).length === 1 && /import ShareBar from "@\/components\/share\/ShareBar"/.test(p)));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} SHARING CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
