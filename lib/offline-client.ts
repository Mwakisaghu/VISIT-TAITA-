// What the browser side of "Save for offline" shares: how to ask the worker (public/sw.js), and how to see what is saved.
// Nothing here runs on its own: the worker is only registered when a visitor presses the button. NOTHING is kept in localStorage, sessionStorage or a cookie: what is saved IS the list
// (each saved page carries the time it was saved, and its own title and language), so there is nothing to get out of step and no extra storage to describe in the privacy policy.
export const SW_URL = "/sw.js";
export const PAGES_CACHE = "taita-pages-v1"; // the worker's cache of saved pages (a test keeps this identical to public/sw.js and public/offline.html)

export function supported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "caches" in window && window.isSecureContext !== false;
}
/** The address a page is saved under: its path, without a trailing slash. */
export const pageUrl = (): string => window.location.pathname.replace(/\/+$/, "") || "/";
/** When this page was saved on this device (milliseconds), 0 if saved but with no time on it, or null if it is not saved. */
export async function savedAt(url: string): Promise<number | null> {
  try {
    const cache = await caches.open(PAGES_CACHE);
    const hit = await cache.match(window.location.origin + url);
    return hit ? Number(hit.headers.get("x-taita-saved-at")) || 0 : null;
  } catch { return null; }
}
/** The plain files this page has already loaded (scripts, styles, fonts, pictures), so the worker can keep them too. */
export function loadedAssets(): string[] {
  try { return performance.getEntriesByType("resource").map((e) => e.name).filter((n) => { try { const u = new URL(n); return u.origin === window.location.origin; } catch { return false; } }).slice(0, 120); } catch { return []; }
}
/** Sends one message to the worker and waits for its answer (or gives up). */
export function ask(worker: ServiceWorker, message: Record<string, unknown>, ms = 20000): Promise<{ ok: boolean; error?: string; savedAt?: number }> {
  return new Promise((resolve) => {
    const ch = new MessageChannel(); const timer = setTimeout(() => resolve({ ok: false, error: "timeout" }), ms);
    ch.port1.onmessage = (e) => { clearTimeout(timer); resolve(e.data); };
    worker.postMessage(message, [ch.port2]);
  });
}
