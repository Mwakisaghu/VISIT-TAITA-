import React from "react"; (globalThis as any).React = React;
const { JSDOM } = require("jsdom"); const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: "https://visittaita.example/essentials", pretendToBeVisual: true }); const w = dom.window as any;
Object.assign(globalThis, { window: w, document: w.document, HTMLElement: w.HTMLElement, Node: w.Node, Event: w.Event }); Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true, writable: true }); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(w, "isSecureContext", { value: true, configurable: true });
const Module = require("module"); const origLoad = Module._load; Module._load = function (r: string, ...x: any[]) { if (r === "next/navigation") return { usePathname: () => "/essentials", useRouter: () => ({ push() {}, refresh() {} }) }; return origLoad.call(this, r, ...x); };
const { createRoot } = require("react-dom/client"); const { act } = require("react");
let root: any; const unmount = async () => { if (root) { await act(async () => root.unmount()); root = null; } };
const $ = (s: string) => w.document.querySelector(s) as any; const $$ = (s: string) => Array.from(w.document.querySelectorAll(s)) as any[]; const norm = (s: string) => (s ?? "").replace(/\s+/g, " ").trim();
const tick = () => act(async () => { await new Promise((r) => setTimeout(r, 25)); });
const click = async (el: any) => { await act(async () => { el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true })); }); await tick(); };
// ---- a fake browser: a worker that answers, a registry that counts, a list of files the page loaded
const store = new Map<string, number>(); let cacheBroken = false;
const worker: any = { calls: [] as any[], at: 1790000000000, answer(m: any) { if (this.fail && m.type === "SAVE") return { ok: false, error: "unavailable" }; if (m.type === "SAVE") { store.set("https://visittaita.example" + m.url, this.at); return { ok: true, savedAt: this.at }; } if (m.type === "REMOVE") { store.delete("https://visittaita.example" + m.url); return { ok: true }; } return { ok: false }; }, postMessage(m: any, ports: any[]) { this.calls.push(m); ports[0].postMessage(this.answer(m)); } };
let registered: any[] = []; const reg = { active: worker };
const install = () => { Object.defineProperty(w.navigator, "serviceWorker", { value: { register: async (u: string, o: any) => { registered.push([u, o]); return reg; }, ready: Promise.resolve(reg) }, configurable: true }); w.caches = (globalThis as any).caches = { open: async () => { if (cacheBroken) throw new Error("blocked"); return { match: async (u: string) => (store.has(u) ? { headers: { get: (h: string) => (h === "x-taita-saved-at" ? String(store.get(u)) : null) } } : undefined) }; } }; };
const uninstall = () => { delete (w.navigator as any).serviceWorker; delete w.caches; delete (globalThis as any).caches; };
const realPerf = globalThis.performance; Object.defineProperty(globalThis, "performance", { value: { now: () => realPerf.now(), timeOrigin: realPerf.timeOrigin, mark() {}, measure() {}, clearMarks() {}, clearMeasures() {}, getEntries: () => [], getEntriesByName: () => [], getEntriesByType: () => [{ name: "https://visittaita.example/_next/static/a.js" }, { name: "https://visittaita.example/api/me" }, { name: "https://cdn.example/x.js" }, { name: "not a url" }] }, configurable: true });
const reset = (path = "/essentials") => { w.localStorage.clear(); w.history.pushState({}, "", path); worker.calls.length = 0; registered = []; store.clear(); cacheBroken = false; worker.at = 1790000000000; delete worker.fail; };
async function main() {
  const Button = (await import("@/components/offline/OfflineSaveButton")).default as any; const Notice = (await import("@/components/offline/OfflineNotice")).default as any; const { LocaleProvider } = await import("@/lib/i18n/client");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const mount = async (el: any, locale = "en") => { await unmount(); w.document.body.innerHTML = '<div id="root"></div>'; root = createRoot(w.document.getElementById("root")); await act(async () => root.render(React.createElement(LocaleProvider, { locale }, el))); await tick(); };
  const btn = () => React.createElement(Button, { tone: "dark" }); const label = () => $$("button").map((b) => norm(b.textContent));
  // ===== nothing happens until asked =====
  uninstall(); reset(); await mount(btn());
  t("A BROWSER THAT CANNOT DO IT SEES NO BUTTON (no half-working feature, no error)", !$("button") && !$("p"));
  install(); reset(); await mount(btn());
  t("BEFORE ANYTHING IS PRESSED THERE IS ONLY A BUTTON, AND NOTHING HAS HAPPENED: no worker is registered, nothing is sent to one, and nothing is stored on the device; the button says what it does and the line under it says the copy stays on this device and nothing is sent anywhere", label().join("|") === "Save for offline" && registered.length === 0 && worker.calls.length === 0 && w.localStorage.length === 0 && /A copy is kept on this device only, and nothing is sent anywhere\./.test(norm($("p")?.textContent)));
  // ===== saving =====
  await click($$("button")[0]);
  t("PRESSING IT SAVES: the worker is registered once from /sw.js for the whole site and asked to save THIS page with the plain files the page had loaded (only this site's own: not another website's), the saved copy is what remembers it (nothing is written to local storage, session storage or a cookie), and the button becomes 'Saved for offline' with the date and the two follow-up buttons", registered.length === 1 && registered[0][0] === "/sw.js" && registered[0][1].scope === "/" && worker.calls.length === 1 && worker.calls[0].type === "SAVE" && worker.calls[0].url === "/essentials" && worker.calls[0].assets.join() === "https://visittaita.example/_next/static/a.js,https://visittaita.example/api/me" && store.get("https://visittaita.example/essentials") === 1790000000000 && w.localStorage.length === 0 && w.sessionStorage.length === 0 && w.document.cookie === "" && /Saved for offline · Saved on .*2026/.test(norm($('[role="status"]')?.textContent)) && label().includes("Update the saved copy") && label().includes("Remove from this device") && !label().includes("Save for offline"));
  // ===== coming back =====
  registered = []; worker.calls.length = 0; await mount(btn());
  t("COMING BACK LATER: the page finds its own saved copy (no new save is requested), shows the saved state with the date the copy carries, and quietly keeps the worker current", /Saved for offline · Saved on/.test(norm($('[role="status"]')?.textContent)) && worker.calls.length === 0 && registered.length === 1);
  worker.at = 1790000900000; await click($$("button").find((b) => /Update the saved copy/.test(b.textContent)));
  t("UPDATING asks for a fresh save and the copy now carries the new time", worker.calls.at(-1).type === "SAVE" && store.get("https://visittaita.example/essentials") === 1790000900000 && store.size === 1);
  await click($$("button").find((b) => /Remove from this device/.test(b.textContent)));
  t("REMOVING asks the worker to forget this page (the copy is gone, so nothing remembers it) and returns to the single Save button", worker.calls.at(-1).type === "REMOVE" && worker.calls.at(-1).url === "/essentials" && store.size === 0 && label().join("|") === "Save for offline");
  // ===== when it fails =====
  reset(); worker.fail = true; await mount(btn()); await click($$("button")[0]);
  t("A FAILED SAVE SAYS SO AND LEAVES NOTHING BEHIND: an alert in words, nothing kept, and the button is there to try again", /Could not save this page\. Check your connection and try again\./.test(norm($('[role="alert"]')?.textContent)) && store.size === 0 && label().join("|") === "Save for offline");
  reset(); await mount(btn()); await click($$("button")[0]); worker.fail = true; await click($$("button").find((b) => /Update the saved copy/.test(b.textContent)));
  t("A FAILED UPDATE KEEPS THE COPY YOU HAVE: the saved state stays on screen, with the error beside it, and the copy is unchanged", /Saved for offline/.test(norm($('[role="status"]')?.textContent)) && !!$('[role="alert"]') && store.get("https://visittaita.example/essentials") === 1790000000000);
  reset("/plan/abcdefghjkmn/"); await mount(btn()); await click($$("button")[0]);
  t("A TRAILING SLASH IN THE ADDRESS IS DROPPED, so the same page is never saved twice and is found again", worker.calls[0].url === "/plan/abcdefghjkmn" && store.has("https://visittaita.example/plan/abcdefghjkmn") && store.size === 1);
  reset(); cacheBroken = true; await mount(btn());
  t("A BLOCKED OR BROKEN CACHE IS TREATED AS 'NOT SAVED' (the button simply offers to save), never a crash", label().join("|") === "Save for offline");
  // ===== language =====
  reset(); await mount(btn(), "fr");
  t("IN FRENCH THE BUTTON AND THE REASSURANCE ARE FRENCH", label().join("|") === "Enregistrer pour l'utiliser hors ligne" && /Une copie est conservée uniquement sur cet appareil/.test(norm($("p")?.textContent)));
  // ===== the offline notice =====
  Object.defineProperty(w.navigator, "onLine", { value: true, configurable: true }); await mount(React.createElement(Notice));
  const whileOnline = $('[role="status"]');
  Object.defineProperty(w.navigator, "onLine", { value: false, configurable: true }); await act(async () => { w.dispatchEvent(new w.Event("offline")); }); const whileOffline = norm($('[role="status"]')?.textContent);
  Object.defineProperty(w.navigator, "onLine", { value: true, configurable: true }); await act(async () => { w.dispatchEvent(new w.Event("online")); });
  t("THE OFFLINE NOTICE: nothing shows while online; when the signal goes it says plainly that this is a copy saved earlier and that times, fares and fees may have changed; when the signal returns it goes away", whileOnline === null && /^You are offline\. This is a copy saved earlier, so times, fares and fees may have changed\.$/.test(whileOffline) && $('[role="status"]') === null);
  await unmount(); let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} OFFLINE BROWSER CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
