import React from "react"; (globalThis as any).React = React;
const { JSDOM } = require("jsdom");
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: "http://localhost/account/tickets?open=g1", pretendToBeVisual: true }); const w = dom.window as any;
let phone = true; let hasMatchMedia = true;
w.matchMedia = (q: string) => ({ matches: phone && /max-width:\s*1023px/.test(q), addEventListener() {}, removeEventListener() {} });
Object.assign(globalThis, { self: w, window: w, document: w.document, HTMLElement: w.HTMLElement, Node: w.Node, Event: w.Event, KeyboardEvent: w.KeyboardEvent, MouseEvent: w.MouseEvent, matchMedia: w.matchMedia });
Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true, writable: true });
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const pushes: any[] = [];
const ROUTER = { push: (...a: any[]) => pushes.push(a), refresh() {} };
const Module = require("module"); const origLoad = Module._load;
Module._load = function (r: string, ...x: any[]) {
  if (r === "next/navigation") return { useRouter: () => ROUTER, usePathname: () => "/account/tickets" }; // the SAME object every time, as Next gives (a new one each render would re-run the effect and hide a missing key)
  if (r === "next/headers") return { headers: () => new Headers({ "x-taita-locale": "en" }) };
  return origLoad.call(this, r, ...x);
};
process.env.NEXT_PUBLIC_APP_URL = "https://visittaita.example";
const { createRoot } = require("react-dom/client"); const { act } = require("react");
const flush = () => act(async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 4)); });
const q = (s: string) => w.document.querySelector(s) as any;
let root: any; const unmount = async () => { if (root) { await act(async () => root.unmount()); root = null; } };
const mount = async (el: any) => { await unmount(); w.document.body.innerHTML = '<div id="root"></div>'; w.document.body.style.overflow = ""; root = createRoot(q("#root")); await act(async () => root.render(el)); await flush(); };
const keydown = async (k: string, o: any = {}) => { const ev = new w.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...o }); await act(async () => { (w.document.activeElement ?? w.document).dispatchEvent(ev); }); await flush(); return ev; };
async function main() {
  const Sheet = (await import("@/components/account-hub/TicketSheet")).default as any;
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const tickets = [{ id: "a1", number: "T-1", holderName: "Neema Mwadime", status: "VALID", priceText: "KES 500", qrUrl: "https://visittaita.example/tickets/verify/SECRET1" }, { id: "a2", number: "T-2", holderName: "Baraka", status: "VALID", priceText: "KES 500", qrUrl: "https://visittaita.example/tickets/verify/SECRET2" }];
  const el = (gid = "g1") => React.createElement(React.Fragment, null, React.createElement("a", { id: "card", href: "/account/tickets?open=" + gid, "aria-current": "true" }, "The card that opened it"), React.createElement("button", { id: "behind" }, "A button behind the sheet"), React.createElement(Sheet, { groupId: gid, eventName: "Taita Cup Final", whenText: "Saturday 14 November 2026, 14:00", location: "Wundanyi", tickets, validCount: 2, closeHref: "/account/tickets", pdfHref: "/tickets/" + gid + "/pdf?lang=en", fullHref: "/tickets/" + gid }));
  const sheet = () => q("#ticket-sheet");
  phone = true; await mount(el());
  t("ON OPENING, FOCUS MOVES TO THE PANEL'S TITLE (a keyboard or screen-reader user lands on the tickets, not somewhere behind them)", w.document.activeElement === q("#ticket-sheet-title"));
  t("ON A PHONE THE SHEET IS A REAL DIALOG: announced as a modal dialog (role and aria-modal), and the page behind stops scrolling", sheet().getAttribute("role") === "dialog" && sheet().getAttribute("aria-modal") === "true" && w.document.body.style.overflow === "hidden");
  pushes.length = 0; await keydown("a"); await keydown("Enter"); await keydown("ArrowDown"); const esc = await keydown("Escape");
  t("ESCAPE CLOSES IT (goes back to the plain list without jumping the page), and no other key does", pushes.length === 1 && pushes[0][0] === "/account/tickets" && pushes[0][1]?.scroll === false && esc.defaultPrevented);
  const focusables = [...sheet().querySelectorAll('a[href], button:not([disabled])')] as any[]; const first = focusables[0], last = focusables[focusables.length - 1];
  last.focus(); const tabLast = await keydown("Tab"); const wrapsToFirst = w.document.activeElement === first && tabLast.defaultPrevented;
  first.focus(); const shiftFirst = await keydown("Tab", { shiftKey: true }); const wrapsToLast = w.document.activeElement === last && shiftFirst.defaultPrevented;
  q("#ticket-sheet-title").focus(); const shiftTitle = await keydown("Tab", { shiftKey: true }); const titleToLast = w.document.activeElement === last && shiftTitle.defaultPrevented;
  q("#behind").focus(); const fromBehind = await keydown("Tab"); const pulledIn = sheet().contains(w.document.activeElement) && fromBehind.defaultPrevented;
  first.focus(); const mid = await keydown("Tab"); const middleFree = !mid.defaultPrevented;
  t("ON A PHONE TAB STAYS INSIDE THE SHEET: from the last control it wraps to the first, Shift+Tab from the first (or from the title) wraps to the last, and focus that has strayed behind the sheet is pulled back in; ordinary Tabbing between its controls is left alone", wrapsToFirst && wrapsToLast && titleToLast && pulledIn && middleFree);
  // close it for real: re-render the page WITHOUT the sheet but with the card still there (as the page does when you press Close)
  await mount(el()); const card = q("#card"); const sh = sheet(); const phoneAttrs = sh.getAttribute("role") === "dialog" && w.document.body.style.overflow === "hidden";
  await act(async () => root.render(React.createElement(React.Fragment, null, React.createElement("a", { id: "card", href: "/account/tickets?open=g1", "aria-current": "true" }, "The card that opened it")))); await flush();
  t("WHEN IT CLOSES, EVERYTHING IS PUT BACK: it WAS a locked dialog (the control for this check), and afterwards the page scrolls again, the dialog attributes are removed from the sheet, and focus is on the ticket that opened it (the card marked aria-current)", phoneAttrs && w.document.body.style.overflow === "" && sh.getAttribute("role") === null && sh.getAttribute("aria-modal") === null && w.document.activeElement === q("#card") && q("#card") === card);
  pushes.length = 0; await keydown("Escape"); t("ESCAPE AFTER IT CLOSED DOES NOTHING (the listener was removed)", pushes.length === 0);
  phone = false; await mount(el());
  t("ON A LAPTOP IT IS A COLUMN, NOT A DIALOG: no role, no aria-modal, the page keeps scrolling, and Tab is never trapped or redirected; focus still lands on the title and Escape still closes it", sheet().getAttribute("role") === null && sheet().getAttribute("aria-modal") === null && w.document.body.style.overflow === "" && w.document.activeElement === q("#ticket-sheet-title"));
  const fl = [...sheet().querySelectorAll('a[href], button:not([disabled])')] as any[]; fl[fl.length - 1].focus(); const tabDesk = await keydown("Tab"); q("#behind").focus(); const tabBehind = await keydown("Tab"); pushes.length = 0; await keydown("Escape");
  t("…Tab on a laptop is the browser's own (never prevented, even from the last control or from behind), and Escape closes", !tabDesk.defaultPrevented && !tabBehind.defaultPrevented && pushes.length === 1);
  hasMatchMedia = false; const savedMM = w.matchMedia; (w as any).matchMedia = undefined; (globalThis as any).matchMedia = undefined; phone = true; let threw = false; try { await mount(el()); } catch { threw = true; }
  t("A BROWSER WITHOUT matchMedia DOES NOT CRASH: it is treated as a laptop (no trapping, no scroll lock)", !threw && w.document.body.style.overflow === "" && sheet()?.getAttribute("role") === null); w.matchMedia = savedMM; (globalThis as any).matchMedia = savedMM;
  phone = true; await mount(el("g1")); q("#behind").focus(); const wasAway = w.document.activeElement === q("#behind");
  await act(async () => root.render(el("g2"))); await flush(); // the SAME tree, a different group (as when you tap another ticket in the list)
  t("OPENING A DIFFERENT GROUP MOVES FOCUS TO THE NEW TITLE AGAIN (the sheet is keyed by the group, so it starts afresh instead of leaving focus where it was): focus had strayed to a control behind the sheet, the same tree is re-rendered for another group, and focus is back on the title", wasAway && w.document.activeElement === q("#ticket-sheet-title") && /g2/.test(q("#ticket-sheet").innerHTML));
  await unmount();
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} TICKET PANEL BROWSER CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
