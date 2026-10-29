// public/offline.html, run for real (its own script) in a browser-like page, with a fake cache of saved pages.
const { JSDOM } = require("jsdom"); const fs = require("fs"); const HTML = fs.readFileSync("public/offline.html", "utf8"); const res = []; const t = (n, ok) => res.push([n, !!ok]);
const ORIGIN = "https://visittaita.example";
const page = (title, lang) => `<!doctype html><html lang="${lang}"><head><title>${title}</title><script>window.__ran = true</script></head><body>x</body></html>`;
async function open({ saved = {}, language = "en-GB", noCaches = false } = {}) {
  const store = new Map(Object.entries(saved)); const deleted = []; const reloads = [];
  const dom = new JSDOM(HTML, { url: ORIGIN + "/offline.html", runScripts: "dangerously", pretendToBeVisual: true, beforeParse(w) {
    Object.defineProperty(w.navigator, "language", { value: language, configurable: true });
    if (!noCaches) w.caches = { open: async (n) => ({ keys: async () => [...store.keys()].map((u) => ({ url: u })), match: async (r) => { const v = store.get(typeof r === "string" ? r : r.url); return v ? { headers: { get: (h) => (h === "x-taita-saved-at" ? String(v.at) : null) }, text: async () => v.html } : undefined; } }), delete: async (n) => { deleted.push(n); store.clear(); return true; } };
  } });
  await new Promise((r) => setTimeout(r, 60)); const d = dom.window.document;
  return { dom, d, deleted, store, text: (id) => d.getElementById(id).textContent, links: () => [...d.querySelectorAll("#list a")] };
}
(async () => {
  let p = await open({ saved: { [ORIGIN + "/essentials"]: { at: 1790000000000, html: page("Visitor essentials", "en") }, [ORIGIN + "/plan/abcdefghjkmn"]: { at: 1790000900000, html: page("A day in Wundanyi", "en") } } });
  t("WITH SAVED PAGES THE PAGE LISTS THEM: each is a link to its address on this site with the title taken from the saved page itself and the day it was saved, the 'nothing saved' message is hidden and the remove-all button is shown, and the page speaks English", p.links().length === 2 && p.links().map((a) => a.getAttribute("href")).sort().join() === "/essentials,/plan/abcdefghjkmn" && p.links().map((a) => a.textContent).sort().join() === "A day in Wundanyi,Visitor essentials" && /Saved on .*2026/.test(p.d.querySelector("#list small").textContent) && p.d.getElementById("none").hidden === true && p.d.getElementById("remove").hidden === false && p.d.documentElement.lang === "en" && p.text("title") === "You are offline");
  p = await open({ saved: { [ORIGIN + "/fr/essentials"]: { at: 1790000000000, html: page("L'essentiel pour les visiteurs", "fr") } }, language: "en-US" });
  t("THE PAGE SPEAKS THE LANGUAGE THE VISITOR SAVED IT IN (not just the phone's): a page saved in French gives a French offline page whatever the phone says, with the date in French", p.d.documentElement.lang === "fr" && p.text("title") === "Vous êtes hors ligne" && /Enregistré le .*2026/.test(p.d.querySelector("#list small").textContent) && p.d.getElementById("remove").textContent === "Supprimer toutes les copies enregistrées");
  p = await open({ language: "sw-KE" }); const none = { sw: p.text("title"), none: p.d.getElementById("none").hidden, rm: p.d.getElementById("remove").hidden };
  p = await open({ language: "de-DE" }); const de = p.text("title"); p = await open({ language: "ja-JP" }); const ja = p.text("title");
  t("WITH NOTHING SAVED it says so (and hides the remove button); with no saved page the phone's language decides: Swahili, German, and English for any language the site does not have", none.sw === "Huna mtandao" && none.none === false && none.rm === true && de === "Du bist offline" && ja === "You are offline" && p.links().length === 0);
  p = await open({ saved: { [ORIGIN + "/essentials"]: { at: 1790000000000, html: page("&lt;img src=x onerror=&quot;window.__pwned=1&quot;&gt; &amp; &lt;b&gt;bold&lt;/b&gt;", "en") } } });
  const a = p.links()[0];
  t("🔒 A TITLE CAN NEVER BECOME MARKUP (a plan's title is typed by a person): a saved title full of tags and an attribute that would run code is shown as plain text, no element is created from it, nothing runs, and a script inside a saved page does not run either (the page is only read, never opened)", a.textContent === '<img src=x onerror="window.__pwned=1"> & <b>bold</b>' && a.children.length === 0 && p.d.querySelectorAll("#list img, #list b").length === 0 && p.dom.window.__pwned === undefined && p.dom.window.__ran === undefined && /innerHTML/.test(HTML) === false);
  p = await open({ saved: { "https://visittaita.example//evil.example/x": { at: 1, html: page("Looks local", "en") }, [ORIGIN + "/essentials"]: { at: 1, html: page("Fine", "en") } } });
  t("A LINK CAN ONLY GO TO A PATH ON THIS SITE: an address that would leave the site (a double slash) is never listed, a normal one is", p.links().map((x) => x.getAttribute("href")).join() === "/essentials");
  p = await open({ saved: { [ORIGIN + "/essentials"]: { at: 1790000000000, html: page("Visitor essentials", "en") } } }); p.d.getElementById("remove").click(); await new Promise((r) => setTimeout(r, 60));
  t("REMOVE ALL deletes both caches (saved pages and their files), says so in words, empties the list, and shows the 'nothing saved' message", p.deleted.sort().join() === "taita-assets-v1,taita-pages-v1" && p.links().length === 0 && p.text("status") === "All saved copies were removed from this device." && p.d.getElementById("none").hidden === false && p.d.getElementById("remove").hidden === true);
  p = await open({ noCaches: true });
  t("A BROWSER WITHOUT SAVED-PAGE STORAGE STILL GETS A WORKING PAGE (a message, a retry button, no error)", p.text("title") === "You are offline" && p.links().length === 0 && p.d.getElementById("retry").textContent === "Try again");
  t("THE PAGE KEEPS NOTHING OF ITS OWN AND SENDS NOTHING: no storage, cookie or network request in its script", !/localStorage|sessionStorage|document\.cookie|fetch\(|XMLHttpRequest|sendBeacon/.test(HTML));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} OFFLINE PAGE CHECKS PASSED`); process.exit(nbad ? 1 : 0);
})().catch((e) => { console.error("ERROR:", e); process.exit(2); });
