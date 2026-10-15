import React from "react"; (globalThis as any).React = React;
const Module = require("module"); const origLoad = Module._load;
Module._load = function (r: string, ...x: any[]) {
  if (r === "next-auth/react") return { useSession: () => ({ data: null, status: "unauthenticated" }), signIn() {}, signOut() {} };
  if (r === "next-auth") return { getServerSession: async () => null };
  if (r === "@/lib/auth") return { authOptions: {}, ADMIN_ROLES: [] };
  if (r === "next/navigation") return { notFound() { throw Object.assign(new Error("NF"), { notFound: true }); }, redirect() {}, useRouter: () => ({}), usePathname: () => "/" };
  if (r === "next/image") return { __esModule: true, default: (p: any) => React.createElement("img", { src: p.src, alt: p.alt }) };
  return origLoad.call(this, r, ...x);
};
let EXP: any = null; let SETTINGS: any = null; const calls: { method: string; args: any }[] = [];
const model = (name: string) => new Proxy({}, { get: (_t, method: string) => async (args?: any) => { calls.push({ method: `${name}.${method}`, args }); if (name === "experience" && (method === "findUnique" || method === "findFirst")) return EXP; if (name === "payoutSettings" && method === "findUnique") return SETTINGS; return method === "findMany" ? [] : method === "groupBy" ? [] : method === "count" ? 0 : null; } });
(globalThis as any).prisma = new Proxy({}, { get: (_t, name: string) => model(name) });
import { renderToStaticMarkup } from "react-dom/server";
const expand = async (n: any): Promise<any> => { if (Array.isArray(n)) return Promise.all(n.map(expand)); if (!n || typeof n !== "object" || !n.type) return n; if (typeof n.type === "function" && n.type.constructor?.name === "AsyncFunction") return expand(await n.type(n.props)); const c = n.props?.children; if (c === undefined || typeof n.type === "function") return n; return React.cloneElement(n, undefined, ...(Array.isArray(c) ? await Promise.all(c.map(expand)) : [await expand(c)])); };
const txt = (h: string) => h.replace(/<[^>]*>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
async function main() {
  const Page = (await import("@/app/experiences/listing/[slug]/page")).default as any;
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const base = { id: "e1", slug: "ridge", name: "The ridge walk", description: "A walk.", image: "/p/x.jpg", region: "Taita Hills", category: "ADVENTURE", status: "PUBLISHED", isDemo: false, priceFrom: 3500, bookingEnabled: true, ownerId: "host1", paymentMode: "ONLINE", depositPercent: 30, balanceDueDays: 3, cancellationPolicy: "FLEXIBLE", maxGuestsPerBooking: 8, externalBookingUrl: null, contactPhone: null, contactEmail: null, duration: "3 hours", difficulty: null, elevationGainM: null, altitudeM: null, hostName: null, hostRole: null, hostQuote: null, groupSizeMax: null, featured: false };
  const render = async (exp: any, settings: any = null) => { EXP = exp; SETTINGS = settings; calls.length = 0; const html = renderToStaticMarkup(await expand(await Page({ params: { slug: "ridge" } }))); return { html, x: txt(html) }; };
  let { html, x } = await render(base);
  t("PAGE (a hosted, bookable experience): the label appears, with the DEFAULT rate when no setting has been saved (10% → KES 3,150 and KES 350, 2-day check period)", /Where your money goes/.test(x) && /Of the KES 3,500 you pay per person/.test(x) && /To the host KES 3,150 · 90%/.test(x) && /To keep Visit Taita running KES 350 · 10%/.test(x) && /2-day check period/.test(x));
  t("PAGE: the label sits in the booking card between the booking panel and the enquiry form, and appears once", html.indexOf("Where your money goes") > html.indexOf("Book online") && html.indexOf("Where your money goes") < html.indexOf("Send an enquiry") && (html.match(/Where your money goes/g) ?? []).length === 1);
  ({ html, x } = await render(base, { id: "singleton", commissionPercent: 15, holdDays: 5 }));
  t("PAGE: it follows the rate the admin has set (15% and 5 days → KES 2,975 and KES 525)", /To the host KES 2,975 · 85%/.test(x) && /To keep Visit Taita running KES 525 · 15%/.test(x) && /5-day check period/.test(x));
  ({ html, x } = await render({ ...base, ownerId: null }));
  t("🔒 PAGE (an experience Visit Taita runs itself — no host): NO label, because its bookings never produce a payout, and the settings aren't even read", !/Where your money goes/.test(x) && !calls.some((c) => c.method === "payoutSettings.findUnique"));
  ({ html, x } = await render({ ...base, bookingEnabled: false })); t("PAGE (not bookable online): NO label (no money flows through the site)", !/Where your money goes/.test(x));
  ({ html, x } = await render({ ...base, priceFrom: null })); t("PAGE (no price): NO label", !/Where your money goes/.test(x) && /Contact for pricing/.test(x));
  ({ html, x } = await render(base, { id: "singleton", commissionPercent: 80, holdDays: 2 })); t("PAGE (a corrupt rate in the database, 80%): no label rather than a wrong one — and the page still works", !/Where your money goes/.test(x) && /The ridge walk/.test(x));
  { const contact = { contactPhone: "+254712345002", contactEmail: "hikes@host.example", externalBookingUrl: "https://host.example/book" };
    const real = await render({ ...base, ...contact, isDemo: false }); const demo = await render({ ...base, ...contact, isDemo: true });
    t("CONTACT (a real listing): the host's phone, email and own booking page are shown under 'Or contact directly', as tap-to-call, mail and link", /Or contact directly/.test(real.x) && real.html.includes('href="tel:+254712345002"') && real.html.includes('href="mailto:hikes@host.example"') && real.html.includes('href="https://host.example/book"'));
    t("🔒 CONTACT (a SAMPLE listing): no tap-to-call number, no email link, no outside booking link and no 'Or contact directly' — placeholder details never reach the public page (a placeholder number can ring a real stranger) — while the enquiry form and the sample notice stay", !/Or contact directly/.test(demo.x) && !/href="tel:/.test(demo.html) && !/href="mailto:/.test(demo.html) && !demo.html.includes("host.example/book") && !demo.html.includes("254712345002") && /Send an enquiry/.test(demo.x) && /Sample content for preview/.test(demo.x)); }
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} MONEY LABEL PAGE CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
