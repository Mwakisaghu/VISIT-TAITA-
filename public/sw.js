"use strict";
// The Visit Taita offline worker.
//
// WHAT IT IS FOR: a visitor in a park with no signal can still read the visitor essentials, or the day they planned.
// WHAT IT WILL NOT DO: it never saves anything on its own. It is only installed when a visitor presses "Save for offline", and it only ever keeps
//   * the visitor essentials page (/essentials, in every language), and
//   * one shared itinerary (/plan/<its 12-character token>, in every language) per press of that button,
// plus the plain files (scripts, styles, fonts, pictures) those pages need. It NEVER keeps the Plan builder (which shows a signed-in visitor's own plans), anyone's account, a
// booking, a payment, a basket, the staff admin or any API answer: they are not on the list, so they are always fetched live, and they are not shown from a copy.
// Everything it keeps lives on the visitor's own device, and the offline page lets them delete it all.

const VERSION = "1";
const PAGES = "taita-pages-v" + VERSION; // the pages the visitor chose to save
const ASSETS = "taita-assets-v" + VERSION; // the plain files those pages need
const SHELL = "taita-shell-v" + VERSION; // the page shown when something that is not saved is asked for with no signal
const OFFLINE_URL = "/offline.html";
const LOCALES = ["sw", "fr", "de"];
const TOKEN = /^[0-9a-hjkmnp-tv-z]{12}$/; // the same rule as isToken in lib/plan.ts (a test keeps them identical)
const MAX_ASSETS = 120;
const SLOW_MS = 4000; // a saved page is shown if the live one takes longer than this

/** The address a page is kept under, or null when it is not one of the pages that may ever be saved. */
function pageKey(url) {
  if (url.origin !== self.location.origin) return null;
  const clean = url.pathname.replace(/\/+$/, "") || "/";
  let path = clean;
  const first = path.split("/")[1];
  if (LOCALES.indexOf(first) !== -1) path = path.slice(first.length + 1) || "/";
  if (path === "/essentials") return url.origin + clean;
  const m = /^\/plan\/([^/]+)$/.exec(path);
  if (m && TOKEN.test(m[1])) return url.origin + clean;
  return null;
}
/** The plain files a saved page needs. */
function isAsset(url) {
  if (url.origin !== self.location.origin) return false;
  const p = url.pathname;
  return p.indexOf("/_next/static/") === 0 || p.indexOf("/_next/image") === 0 || p.indexOf("/brand/") === 0 || p.indexOf("/icons/") === 0;
}
/** A copy of the answer with the time it was saved written on it, so the page and the offline page can say "saved on ..." without keeping a list anywhere else. */
async function stamped(res) {
  const at = Date.now();
  const headers = new Headers(res.headers);
  headers.set("x-taita-saved-at", String(at));
  return { at, response: new Response(await res.arrayBuffer(), { status: res.status, statusText: res.statusText, headers }) };
}
const isHtml = (res) => (res.headers.get("content-type") || "").indexOf("text/html") !== -1;
function fetchWithin(req, ms) {
  return new Promise((resolve, reject) => {
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => { if (ctl) ctl.abort(); reject(new Error("slow")); }, ms);
    fetch(req, ctl ? { signal: ctl.signal } : undefined).then((r) => { clearTimeout(timer); resolve(r); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.add(OFFLINE_URL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.indexOf("taita-") === 0 && [PAGES, ASSETS, SHELL].indexOf(k) === -1).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") { event.respondWith(navigation(req, url)); return; }
  if (isAsset(url)) event.respondWith(staleWhileRevalidate(req));
  // anything else (the API, account, payments, the admin...) is not touched: it goes straight to the network
});

async function navigation(req, url) {
  const key = pageKey(url);
  const pages = await caches.open(PAGES);
  const saved = key ? await pages.match(key) : undefined;
  try {
    const res = saved ? await fetchWithin(req, SLOW_MS) : await fetch(req);
    // a page the visitor saved is refreshed whenever they open it with a signal; no other page is ever stored
    if (saved && res.ok && !res.redirected && isHtml(res)) await pages.put(key, (await stamped(res.clone())).response);
    return res;
  } catch (e) {
    if (saved) return saved;
    const shell = await caches.match(OFFLINE_URL);
    return shell || Response.error();
  }
}
async function staleWhileRevalidate(req) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(req);
  const live = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await live) || Response.error();
}

self.addEventListener("message", (event) => {
  const port = event.ports && event.ports[0];
  const answer = (r) => { if (port) port.postMessage(r); };
  event.waitUntil(handle(event.data || {}).then(answer, (e) => answer({ ok: false, error: String((e && e.message) || e) })));
});
async function handle(d) {
  if (d.type === "SAVE") {
    if (typeof d.url !== "string") return { ok: false, error: "bad-request" };
    const url = new URL(d.url, self.location.origin);
    const key = pageKey(url);
    if (!key) return { ok: false, error: "not-allowed" };
    const res = await fetchWithin(new Request(key, { credentials: "same-origin" }), 15000);
    if (!res.ok || res.redirected || !isHtml(res)) return { ok: false, error: "unavailable" };
    const pages = await caches.open(PAGES);
    const keep = await stamped(res.clone());
    await pages.put(key, keep.response);
    const assets = await caches.open(ASSETS);
    const list = Array.isArray(d.assets) ? d.assets.slice(0, MAX_ASSETS) : [];
    for (const a of list) {
      try {
        const u = new URL(String(a), self.location.origin);
        if (!isAsset(u) || (await assets.match(u.href))) continue;
        const r = await fetch(u.href);
        if (r.ok) await assets.put(u.href, r);
      } catch (e) { /* one missing file must not stop the page being saved */ }
    }
    return { ok: true, savedAt: keep.at };
  }
  if (d.type === "REMOVE") {
    if (typeof d.url !== "string") return { ok: false, error: "bad-request" };
    const key = pageKey(new URL(d.url, self.location.origin));
    if (!key) return { ok: false, error: "not-allowed" };
    const pages = await caches.open(PAGES);
    await pages.delete(key);
    return { ok: true };
  }
  if (d.type === "REMOVE_ALL") {
    await caches.delete(PAGES);
    await caches.delete(ASSETS);
    return { ok: true };
  }
  if (d.type === "LIST") {
    const pages = await caches.open(PAGES);
    return { ok: true, pages: (await pages.keys()).map((r) => r.url) };
  }
  return { ok: false, error: "unknown" };
}
