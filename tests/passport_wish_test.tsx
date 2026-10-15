import React from "react"; (globalThis as any).React = React;
const Module = require("module"); const origLoad = Module._load;
let session: any = { user: { id: "uA" } };
Module._load = function (r: string, ...x: any[]) {
  if (r === "next-auth") return { getServerSession: async () => session };
  if (r === "@/lib/auth") return { authOptions: {} };
  if (r === "next/navigation") return { redirect: (u: string) => { throw Object.assign(new Error("REDIRECT"), { redirectTo: u }); }, notFound() { throw new Error("NF"); }, useRouter: () => ({}) };
  if (r === "next/cache") return { revalidatePath() {} };
  if (r === "next/image") return { __esModule: true, default: (p: any) => React.createElement("img", { src: p.src, alt: p.alt }) };
  return origLoad.call(this, r, ...x);
};
const calls: { method: string; args: any }[] = []; let WISHES: any[] = [];
const user = { id: "uA", name: "Amina", points: 120, badges: [], visits: [] };
const model = (name: string) => new Proxy({}, { get: (_t, method: string) => async (args?: any) => { calls.push({ method: `${name}.${method}`, args }); if (name === "user" && method === "findUnique") return user; if (name === "placeWish" && method === "findMany") return WISHES; return method === "findMany" ? [] : null; } });
(globalThis as any).prisma = new Proxy({}, { get: (_t, name: string) => model(name) });
import { renderToStaticMarkup } from "react-dom/server";
const txt = (h: string) => h.replace(/<script\b[\s\S]*?<\/script>/g, " ").replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]*>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&ldquo;|&rdquo;/g, '"').replace(/\s+/g, " ");
async function main() {
  const Page = (await import("@/app/passport/page")).default as any; const WishList = (await import("@/components/stamps/WishList")).default as any; const Stamp = (await import("@/components/stamps/StampMark")).default as any;
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const W = [{ destination: { id: "d1", name: "Ngangao Forest", slug: "ngangao-forest", region: "Dawida Hills", altitudeM: 2149 } }, { destination: { id: "d2", name: "Lake Jipe", slug: "lake-jipe", region: "Taveta", altitudeM: null } }];
  WISHES = W; calls.length = 0; let html = renderToStaticMarkup(await Page()); let text = txt(html);
  t("PASSPORT: a 'Want to go' section appears, with each saved place, its region, 'altitude · zone' only where known, and a link that shows it on the map", /Want to go/.test(text) && /Ngangao Forest/.test(text) && /Dawida Hills/.test(text) && /2,149 m · Highlands/.test(text) && /Lake Jipe/.test(text) && html.includes('href="/map?place=ngangao-forest"') && html.includes('href="/map?place=lake-jipe"') && !/null|undefined/.test(text));
  t("PASSPORT: every saved place has its own 'Remove' button that names the place for screen readers, and the section is a labelled region (one heading)", (html.match(/>Remove<span class="sr-only"> /g) ?? []).length === 2 && /Remove<span class="sr-only"> Ngangao Forest from your list/.test(html) && /aria-labelledby="wish-title"/.test(html) && /id="wish-title"/.test(html));
  t("PASSPORT: it sits before the check-ins, and the existing sections (badges, check-ins) are all still there", html.indexOf("Want to go") < html.indexOf("Check in around Taita") && /Your badges/.test(text) && /Check in around Taita/.test(text));
  const q = calls.find((c) => c.method === "placeWish.findMany")!.args;
  t("🔒 PASSPORT (query): only the signed-in person's saved places, only places still published, newest first, and only the few fields the list shows", q.where.userId === "uA" && q.where.destination.status === "PUBLISHED" && JSON.stringify(q.orderBy) === '{"createdAt":"desc"}' && JSON.stringify(Object.keys(q.select.destination.select).sort()) === '["altitudeM","id","name","region","slug"]');
  WISHES = []; html = renderToStaticMarkup(await Page()); text = txt(html); t("PASSPORT (nothing saved): a friendly empty state with a link to the map, and no list", /Nothing saved yet\./.test(text) && html.includes('href="/map"') && !/>Remove</.test(html));
  session = null; let redirected = ""; try { await Page(); } catch (e: any) { redirected = e.redirectTo ?? ""; } t("PASSPORT: signed out still goes to the sign-in page (unchanged)", redirected === "/login");
  const wl = renderToStaticMarkup(React.createElement(WishList, { wishes: [{ id: "d1", name: "A <b>bold</b> place", slug: "a", region: "R", altitudeM: 900 }] })); t("WISH LIST: a place name with HTML characters is shown as text, never as markup", !/<b>bold<\/b>/.test(wl) && /A &lt;b&gt;bold&lt;\/b&gt; place/.test(wl));
  const s1 = renderToStaticMarkup(React.createElement(Stamp, { name: "Ngangao Forest", verified: true })), s2 = renderToStaticMarkup(React.createElement(Stamp, { name: "Ngangao Forest", verified: false }));
  const two = renderToStaticMarkup(React.createElement(React.Fragment, null, React.createElement(Stamp, { name: "A", verified: true }), React.createElement(Stamp, { name: "B", verified: true }))); const longText = renderToStaticMarkup(React.createElement(Stamp, { name: "x".repeat(60), verified: true }));
  t("STAMP: a screen reader hears 'Checked in: Ngangao Forest' or 'Marked as visited: …'; a verified stamp is solid and a self-reported one dashed; the ring text names the place in capitals", /aria-label="Checked in: Ngangao Forest"/.test(s1) && /aria-label="Marked as visited: Ngangao Forest"/.test(s2) && !/stroke-dasharray/.test(s1) && /stroke-dasharray="5 3"/.test(s2) && /CHECKED IN · NGANGAO FOREST ·/.test(s1) && /BEEN HERE · NGANGAO FOREST ·/.test(s2) && /textLength="270"/.test(s1));
  t("STAMP: two stamps on one page get different ring ids (so the lettering of one can't be drawn on the other), and a very long name is cut to 22 letters on the ring (the full name stays in the spoken label)", new Set([...two.matchAll(/<path id="(ring-[^"]+)"/g)].map((m) => m[1])).size === 2 && /X{22}[^X]/.test(longText.replace(/aria-label="[^"]*"/, "")) && !/X{23}/.test(longText.replace(/aria-label="[^"]*"/, "")) && /x{60}/.test(longText));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} PASSPORT WISH LIST AND STAMP CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
