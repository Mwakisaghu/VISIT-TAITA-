import React from "react"; (globalThis as any).React = React;
const { JSDOM } = require("jsdom");
const dom = new JSDOM('<!doctype html><html lang="sw"><body><div id="root"></div></body></html>', { url: "https://visittaita.example/shop/vidasi?secret=1&email=a@b.co#frag", pretendToBeVisual: true }); const w = dom.window as any;
const beacons: { url: string; blob: Blob }[] = []; const fetches: { url: string; init: any }[] = []; let beaconResult: boolean | "throw" = true; let fetchResult: "ok" | "reject" = "ok"; let onBeacon: (() => void) | null = null;
w.navigator.sendBeacon = (url: string, blob: Blob) => { onBeacon?.(); if (beaconResult === "throw") throw new Error("beacon blocked"); if (beaconResult === true) beacons.push({ url, blob }); return beaconResult === true; }; // a beacon the browser REFUSES is not recorded as sent
Object.assign(globalThis, { self: w, window: w, document: w.document, HTMLElement: w.HTMLElement, Node: w.Node, Event: w.Event });
Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true, writable: true });
(globalThis as any).fetch = (url: string, init: any) => { fetches.push({ url, init }); return fetchResult === "ok" ? Promise.resolve({ ok: true }) : Promise.reject(new Error("offline")); };
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require("react-dom/client"); const { act } = require("react");
const modPath = require.resolve("../components/ErrorReporter");
let root: any; const mount = async (Comp: any) => { await unmount(); w.document.body.innerHTML = '<div id="root"></div>'; root = createRoot(w.document.getElementById("root")); await act(async () => root.render(React.createElement(Comp))); };
const unmount = async () => { if (root) { await act(async () => root.unmount()); root = null; } };
const load = () => { delete require.cache[modPath]; return require(modPath); }; // a fresh copy of the module: it keeps per-page state
const reset = () => { beacons.length = 0; fetches.length = 0; beaconResult = true; fetchResult = "ok"; onBeacon = null; };
const fire = (type: string, props: any) => { const ev: any = new w.Event(type); Object.assign(ev, props); w.dispatchEvent(ev); };
const body = async (i = 0) => JSON.parse(await beacons[i].blob.text());
async function main() {
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  reset(); let M = load(); await mount(M.default);
  const err = new Error("Widget failed to start"); fire("error", { message: err.message, error: err });
  const b0 = beacons.length === 1 ? await body(0) : null;
  t("A SCRIPT ERROR IS REPORTED to /api/errors as a small JSON beacon: its kind, message and trace, the page's PATH ONLY (the ?query and #fragment of the page are left behind: here they held a secret and an email), and the page language", beacons.length === 1 && beacons[0].url === "/api/errors" && b0.kind === "error" && b0.message === "Widget failed to start" && /Widget failed/.test(b0.stack) && b0.path === "/shop/vidasi" && b0.locale === "sw" && !/secret|a@b\.co|frag/.test(JSON.stringify(b0)) && beacons[0].blob.type === "application/json");
  t("…and nothing else is sent: exactly kind, message, stack, path and language (no cookie, no storage, no user agent: the server reads the browser from the request itself)", Object.keys(b0).sort().join() === "kind,locale,message,path,stack");
  reset(); M = load(); await unmount(); await mount(M.default);
  fire("unhandledrejection", { reason: new TypeError("Promise failed") }); fire("unhandledrejection", { reason: "a plain string reason" }); fire("unhandledrejection", { reason: { code: 5 } }); fire("unhandledrejection", { reason: null });
  t("AN UNHANDLED PROMISE FAILURE IS REPORTED too (an Error, or a plain string) with its own kind; a value with no message (an object, null) is not worth reporting", beacons.length === 2 && (await body(0)).kind === "unhandledrejection" && (await body(0)).message === "Promise failed" && (await body(1)).message === "a plain string reason");
  reset(); M = load(); await unmount(); await mount(M.default);
  const noisy: any[] = [["ResizeObserver loop completed with undelivered notifications.", null], ["Script error.", null], ["The operation was aborted.", null], ["AbortError: signal is aborted", null], ["request cancelled", null], ["", null], ["boom", new Error("x")]];
  for (const [m] of noisy.slice(0, 6)) fire("error", { message: m, error: null }); const quiet = beacons.length;
  const ext = new Error("from an extension"); ext.stack = "Error: from an extension\n    at x (chrome-extension://abcdef/content.js:1:1)"; fire("error", { message: ext.message, error: ext }); const afterExt = beacons.length;
  t("NOISE IS NOT REPORTED: browser quirks (ResizeObserver), cross-origin 'Script error.', cancelled requests, empty messages, and errors raised by a browser extension", quiet === 0 && afterExt === 0);
  reset(); M = load(); await unmount(); await mount(M.default);
  const same = new Error("Same failure twice"); fire("error", { message: same.message, error: same }); fire("error", { message: same.message, error: same }); fire("error", { message: same.message, error: same });
  t("THE SAME FAILURE IS REPORTED ONCE PER PAGE (a failure in a loop cannot send a thousand reports)", beacons.length === 1);
  reset(); M = load(); await unmount(); await mount(M.default);
  for (let i = 0; i < 12; i++) { const e = new Error(`Different failure number ${["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"][i]}`); fire("error", { message: e.message, error: e }); }
  t("A PAGE REPORTS AT MOST 5 DIFFERENT FAILURES (a broken page cannot flood the endpoint): twelve different ones sent, five reported", beacons.length === 5);
  reset(); M = load(); await unmount(); await mount(M.default);
  const big = new Error("m".repeat(5000)); big.stack = "s".repeat(9000); M.reportClientError(big, "render", "e".repeat(5000)); const bb = await body(0);
  t("EVERYTHING IS SHORTENED BEFORE SENDING (a 5000-letter message becomes 500, a 9000-letter trace 4000, the extra 1000), so a report is always small", bb.message.length === 500 && bb.stack.length === 4000 && bb.extra.length === 1000 && bb.kind === "render");
  reset(); M = load(); M.reportClientError(Object.assign(new Error("Server render failed"), { digest: "1234567890" }), "render"); M.reportClientError(Object.assign(new Error("Odd digest"), { digest: 42 }), "render"); const dg = [await body(0), await body(1)];
  t("A REFERENCE CODE (digest) is passed along only when it is text", dg[0].digest === "1234567890" && dg[1].digest === undefined);
  reset(); M = load(); beaconResult = false; M.reportClientError(new Error("Beacon refused"), "error");
  t("IF THE BROWSER REFUSES THE BEACON the report is sent with fetch instead (a POST with a JSON content type that survives leaving the page), and a network failure there is swallowed, not shown to anyone", beacons.length === 0 && fetches.length === 1 && fetches[0].url === "/api/errors" && fetches[0].init.method === "POST" && fetches[0].init.keepalive === true && fetches[0].init.headers["Content-Type"] === "application/json" && JSON.parse(fetches[0].init.body).message === "Beacon refused");
  reset(); M = load(); beaconResult = false; fetchResult = "reject"; let threw = false; try { M.reportClientError(new Error("Offline failure"), "error"); await new Promise((r) => setTimeout(r, 20)); } catch { threw = true; }
  reset(); M = load(); beaconResult = "throw"; let threw2 = false; try { M.reportClientError(new Error("Blocked beacon"), "error"); } catch { threw2 = true; }
  t("REPORTING CAN NEVER BREAK THE PAGE: an offline network, a beacon that throws, and odd input (null, undefined, a number, an object with no message) are all ignored silently", !threw && !threw2 && (() => { reset(); const M2 = load(); try { M2.reportClientError(null); M2.reportClientError(undefined); M2.reportClientError(42); M2.reportClientError({}); M2.reportClientError("a string", "error"); return beacons.length === 1; } catch { return false; } })());
  reset(); M = load(); await unmount(); await mount(M.default);
  onBeacon = () => { const e = new Error("A failure caused by reporting"); fire("error", { message: e.message, error: e }); }; const first = new Error("The original failure"); fire("error", { message: first.message, error: first });
  t("REPORTING CANNOT LOOP: a failure that happens WHILE a report is being sent is not itself reported (only the original is)", beacons.length === 1 && (await body(0)).message === "The original failure");
  reset(); M = load(); await mount(M.default); await unmount(); const e2 = new Error("After the page is gone"); fire("error", { message: e2.message, error: e2 }); fire("unhandledrejection", { reason: new Error("also after") });
  t("THE LISTENERS ARE REMOVED when the reporter goes away (a failure after that is not reported by a component that no longer exists)", beacons.length === 0);
  reset(); M = load(); await mount(M.default); await act(async () => root.render(React.createElement(M.default))); await act(async () => root.render(React.createElement(M.default))); const e3 = new Error("One listener only"); fire("error", { message: e3.message, error: e3 });
  t("RE-RENDERING DOES NOT ADD LISTENERS (a failure is reported once however many times the page redraws)", beacons.length === 1);
  await unmount();
  const fs = require("fs"); const read = (f: string) => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
  t("THE REPORTER'S SOURCE: a client component with no raw HTML, no storage and no cookies, and it sends only to the site's own /api/errors", /^"use client";/.test(read("components/ErrorReporter.tsx")) && !/dangerouslySetInnerHTML|localStorage|sessionStorage|document\.cookie/.test(read("components/ErrorReporter.tsx")) && (read("components/ErrorReporter.tsx").match(/"\/api\/errors"/g) ?? []).length === 2 && !/https?:\/\//.test(read("components/ErrorReporter.tsx").replace(/\/\/.*$/gm, "")));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} ERROR REPORTER BROWSER CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
