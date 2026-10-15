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
const Mod = require("module"); const prevLoad = Mod._load; let IP = "10.0.0.1";
Mod._load = function (r: string, ...x: any[]) {
  if (r === "next/headers") return { headers: () => new Headers({ "x-forwarded-for": IP }) };
  if (r === "next/cache") return { revalidatePath() {} };
  if (r === "next-auth") return { getServerSession: async () => null };
  if (r === "@/lib/auth") return { authOptions: {}, ADMIN_ROLES: ["ADMIN"] };
  return prevLoad.call(this, r, ...x);
};
const calls: string[] = []; (globalThis as any).prisma = new Proxy({}, { get: (_t, model: string) => new Proxy({}, { get: (_t2, m: string) => async () => { calls.push(model + "." + m); return m === "create" ? { id: "x" } : m === "findMany" ? [] : null; } }) });
const fd = (o: Record<string, string>) => ({ get: (k: string) => (k in o ? o[k] : null) });
async function main() {
  const S = await import("@/lib/spam"); const Guard = (await import("@/components/forms/SpamGuard")).default as any;
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const NOW = 1_800_000_000_000; const v = (o: Record<string, string>, extra: any = {}) => S.spamVerdict(fd(o), { now: NOW, ...extra });
  t("RULES (the trap): a filled hidden field is a bot — the shared one, or a form's own extra one; blank or spaces only is fine; non-text values are ignored", v({ [S.HONEYPOT_FIELD]: "http://spam.example" }).reason === "honeypot" && v({ website: "x" }, { honeypots: ["website"] }).reason === "honeypot" && v({ website: "x" }).ok === true && v({ [S.HONEYPOT_FIELD]: "   " }).ok === true && v({ [S.HONEYPOT_FIELD]: "" }).ok === true && S.spamVerdict({ get: () => 5 }, { now: NOW }).ok === true);
  t("RULES (the clock): a form filled in under 1.5 seconds is too fast; 1.5 seconds or more is fine; the boundary is exact", v({ [S.STARTED_FIELD]: String(NOW - 200) }).reason === "too-fast" && v({ [S.STARTED_FIELD]: String(NOW - 1499) }).reason === "too-fast" && v({ [S.STARTED_FIELD]: String(NOW - 1500) }).ok === true && v({ [S.STARTED_FIELD]: String(NOW - 60_000) }).ok === true);
  t("RULES (never punish a person): no timestamp (JavaScript off, or an old page) is not checked; a time in the future (a wrong clock), a page left open for over a week, and garbage are all let through; missing or odd form objects never crash", v({}).ok && v({ [S.STARTED_FIELD]: String(NOW + 5000) }).ok && v({ [S.STARTED_FIELD]: String(NOW - 8 * 86_400_000) }).ok && ["abc", "-5", "12.5", "1e12", "", "99999999999999999"].every((g) => v({ [S.STARTED_FIELD]: g }).ok) && S.spamVerdict(null).ok && S.spamVerdict(undefined).ok && S.spamVerdict({} as any).ok);
  t("RULES (the trap wins): a filled trap is a bot even when the timestamp looks human", v({ [S.HONEYPOT_FIELD]: "x", [S.STARTED_FIELD]: String(NOW - 30_000) }).reason === "honeypot");
  // ===== the hidden guard in a real browser engine =====
  await mount(<form id="f"><input name="name" defaultValue="Amina" /><Guard /></form>); await flush();
  const form: any = q("#f"); const data = new w.FormData(form); const started = Number(data.get(S.STARTED_FIELD));
  t("GUARD (in the browser): once the page is live, the form carries the moment it appeared (a current time) and an EMPTY trap; both are sent with the form's other fields", Math.abs(Date.now() - started) < 5000 && data.get(S.HONEYPOT_FIELD) === "" && data.get("name") === "Amina");
  const wrap: any = q("#f > div"); const trap: any = q(`input[name="${S.HONEYPOT_FIELD}"]`);
  t("GUARD (invisible and harmless): hidden from screen readers (aria-hidden), the trap cannot be tabbed to, autofill is off, there is no visible text or label, and it is positioned off-screen so it takes up no room", wrap.getAttribute("aria-hidden") === "true" && trap.tabIndex === -1 && trap.getAttribute("autocomplete") === "off" && wrap.textContent.trim() === "" && /-left-\[9999px\]/.test(wrap.className) && !wrap.querySelector("label"));
  // ===== the public actions =====
  const A = { contact: await import("@/lib/actions/contact"), sponsor: await import("@/lib/actions/sponsor-leads"), enq: await import("@/lib/actions/enquiries"), partner: await import("@/lib/actions/partners") } as any;
  const bot = { [S.HONEYPOT_FIELD]: "x" }, quick = { [S.STARTED_FIELD]: String(Date.now() - 100) };
  const guardOnly = async (label: string, call: (o: any) => Promise<any>, legacy?: Record<string, string>) => { calls.length = 0; const a = await call(bot), b = await call(quick), c = legacy ? await call(legacy) : { success: true }; return { a, b, c, touched: calls.length }; };
  const checks: [string, any][] = [["contact", await guardOnly("contact", (o) => A.contact.submitContactMessage(fd(o)), { website: "x" })], ["sponsor enquiry", await guardOnly("sponsor", (o) => A.sponsor.submitSponsorLead(fd(o)), { companyWebsite: "x" })], ["stay enquiry", await guardOnly("stay", (o) => A.enq.submitAccommodationEnquiry("a1", fd(o)))], ["experience enquiry", await guardOnly("exp", (o) => A.enq.submitExperienceEnquiry("e1", fd(o)))], ["partner application", await guardOnly("partner", (o) => A.partner.submitApplication(fd(o)))]];
  for (const [name, r] of checks) t(`ACTION (${name}): a bot that fills the trap is told 'success' and NOTHING is stored (it learns nothing); a form filled in a flash is asked kindly to try again, also storing nothing; the form's older trap field still works; the database is never touched`, r.a.success === true && !r.a.error && r.b.error === S.SPAM_RETRY && !r.b.success && r.c.success === true && r.touched === 0);
  // partner applications end to end
  const base = { businessName: "Hill Guides", contactName: "Amina Mwandawiro", email: "amina@hillguides.example", phone: "+254722000111", partnerType: "EXPERIENCE", message: "We run guided walks around Wundanyi and would like to list them." };
  const slow = { [S.STARTED_FIELD]: String(Date.now() - 5000) };
  calls.length = 0; IP = "10.1.1.1"; const ok = await A.partner.submitApplication(fd({ ...base, ...slow })); const noJs = (IP = "10.1.1.2", await A.partner.submitApplication(fd({ ...base, email: "b@x.example" })));
  t("PARTNER APPLICATION (the normal way): a real person filling it in normally is accepted and stored; so is someone with JavaScript off (no timestamp)", ok.success === true && noJs.success === true && calls.filter((c) => c === "partnerApplication.create").length === 2);
  calls.length = 0; IP = "10.2.2.2"; const bad = await A.partner.submitApplication(fd({ ...base, email: "bad", ...slow }));
  t("PARTNER APPLICATION (bad data): invalid details are refused before anything is stored", !!bad.error && calls.filter((c) => /create/.test(c)).length === 0);
  calls.length = 0; IP = "10.3.3.3"; const outs: any[] = []; for (let i = 0; i < 5; i++) outs.push(await A.partner.submitApplication(fd({ ...base, email: `p${i}@x.example`, ...slow })));
  t("PARTNER APPLICATION (a flood from one connection): the first three in an hour are accepted, the fourth and fifth are refused politely and are not stored", outs.slice(0, 3).every((o) => o.success) && outs.slice(3).every((o) => /Too many applications/.test(o.error)) && calls.filter((c) => c === "partnerApplication.create").length === 3);
  calls.length = 0; const e1 = (IP = "10.4.4.4", await A.partner.submitApplication(fd({ ...base, email: "same@x.example", ...slow }))), e2 = (IP = "10.4.4.5", await A.partner.submitApplication(fd({ ...base, email: "same@x.example", ...slow }))), e3 = (IP = "10.4.4.6", await A.partner.submitApplication(fd({ ...base, email: "SAME@x.example", ...slow }))), e4 = (IP = "10.4.4.7", await A.partner.submitApplication(fd({ ...base, email: "SAME@x.example", ...slow })));
  t("PARTNER APPLICATION (one email, many connections): the same email (any capitalisation) can apply twice a day, then is told we already have it; a different person is unaffected", e1.success && e2.success && /already have an application/.test(e3.error) && /already have an application/.test(e4.error) && calls.filter((c) => c === "partnerApplication.create").length === 2);
  { const hl = S.hitLimit; const T0 = 1_000_000; const key = (n: string) => "test:" + n + Math.random();
    const a = key("a"); const seq = [hl(a, 3, 1000, T0), hl(a, 3, 1000, T0 + 1), hl(a, 3, 1000, T0 + 2), hl(a, 3, 1000, T0 + 3)]; const later = hl(a, 3, 1000, T0 + 1500); const b = key("b");
    t("LIMITER (its own, self-contained): the first three attempts in a window are allowed and the fourth refused; once the window has passed attempts are allowed again; each key is counted separately", seq.join() === "true,true,true,false" && later === true && hl(b, 3, 1000, T0) === true);
    const c = key("c"); for (let i = 0; i < 3; i++) hl(c, 3, 60_000, T0); const refused = hl(c, 3, 60_000, T0 + 10);
    for (let i = 0; i < 6000; i++) hl("flood:" + i, 1, 1000, T0 + 2 * 86_400_000); const afterFlood = hl(key("d"), 1, 1000, T0 + 2 * 86_400_000 + 5);
    t("LIMITER (cannot grow without limit or break): a refused key stays refused until its window passes, and thousands of different keys neither crash it nor stop it working (old entries are swept)", refused === false && afterFlood === true);
    const pa = fs.readFileSync("lib/actions/partners.ts", "utf8");
    t("PARTNER APPLICATION (does not depend on another module's shape): the action uses the project's shared limiter (awaited) when it has one, otherwise the guard's own, and never the removed old rateLimit() — so it compiles whatever the project's limiter looks like", (/!hitLimit\(`partner-apply:ip:/.test(pa) && /!hitLimit\(`partner-apply:email:/.test(pa) && !/lib\/rate-limit/.test(pa) || /!\(await checkRateLimit\(`partner-apply:ip:/.test(pa) && /!\(await checkRateLimit\(`partner-apply:email:/.test(pa) && /from "@\/lib\/rate-limit"/.test(pa)) && !/(?<![.\w$])rateLimit\(/.test(pa)); }
  // ===== nothing left unprotected =====
  const forms: [string, string][] = [["components/legal/ContactForm.tsx", "submit"], ["components/listings/AccommodationEnquiryForm.tsx", "handleSubmit"], ["components/listings/ExperienceEnquiryForm.tsx", "handleSubmit"], ["components/sponsors/SponsorLeadForm.tsx", "handleSubmit"], ["app/partners/apply/page.tsx", "handleSubmit"]];
  t("WIRING (every public form has the guard): contact, both enquiry forms, sponsor enquiries and partner applications each contain the hidden guard inside their form; the partner STATUS lookup (which stores nothing) does not need it", forms.every(([f, h]) => { const s = fs.readFileSync(f, "utf8"); const i = s.indexOf(`<form onSubmit={${h}}`); return i > 0 && s.slice(i, i + 400).includes("<SpamGuard />") && s.includes('from "@/components/forms/SpamGuard"'); }) && !fs.readFileSync("app/partners/apply/page.tsx", "utf8").slice(fs.readFileSync("app/partners/apply/page.tsx", "utf8").indexOf("<form onSubmit={handleStatusCheck}")).slice(0, 300).includes("SpamGuard"));
  const acts = ["contact", "sponsor-leads", "enquiries", "partners"].map((n) => fs.readFileSync(`lib/actions/${n}.ts`, "utf8"));
  t("WIRING (the check comes first): in each public action the spam check runs before the form is read for anything or anything is stored", acts.every((s) => { const g = s.indexOf("spamVerdict(formData"); return g > 0 && !s.slice(0, g).match(/prisma\.[a-zA-Z]+\.(create|update|upsert)/) && !s.slice(0, g).includes("rateLimit(`"); }) && (fs.readFileSync("lib/actions/enquiries.ts", "utf8").match(/spamVerdict\(formData\)/g) ?? []).length === 2);
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} SPAM PROTECTION CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
