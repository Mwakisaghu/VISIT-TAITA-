import React from "react"; (globalThis as any).React = React;
const { JSDOM } = require("jsdom");
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: "http://localhost/login", pretendToBeVisual: true }); const w = dom.window as any;
Object.assign(globalThis, { FormData: w.FormData, HTMLInputElement: w.HTMLInputElement, HTMLFormElement: w.HTMLFormElement, Element: w.Element, self: w, window: w, document: w.document, HTMLElement: w.HTMLElement, Node: w.Node, Event: w.Event, KeyboardEvent: w.KeyboardEvent, MouseEvent: w.MouseEvent, ClipboardEvent: w.ClipboardEvent ?? w.Event });
Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true, writable: true }); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
w.matchMedia = w.matchMedia ?? (() => ({ matches: true, addEventListener() {}, removeEventListener() {} })); Object.defineProperty(globalThis, "matchMedia", { value: w.matchMedia, configurable: true });
let sessionCalls = 0; const adm: any = { ask: [], cancel: [], link: [], reply: {} }; let superAdmins: any = 1; (globalThis as any).prisma = new Proxy({}, { get: (_t, m: string) => m === "user" ? { count: async () => { if (superAdmins === "down") throw new Error("db"); return superAdmins; } } : new Proxy({}, { get: () => async () => null }) }); const ts: any = { start: [], confirm: [], renew: [], off: [], reply: {} }; const pushes: string[] = []; let refreshes = 0; let search = ""; let signInReply: any = {}; let session: any = {}; const signInCalls: any[] = []; const resetCalls: any[] = []; let resetReply: any = { ok: true }; let hold: Promise<void> | null = null;
const Module = require("module"); const origLoad = Module._load;
Module._load = function (r: string, ...x: any[]) {
  if (r === "next/navigation") return { useRouter: () => ({ push: (u: string) => pushes.push(u), refresh: () => { refreshes++; } }), useSearchParams: () => new URLSearchParams(search), usePathname: () => "/login" };
  if (r === "next-auth/react") return { signIn: async (...a: any[]) => { signInCalls.push(a); if (hold) await hold; return signInReply; }, getSession: async () => { sessionCalls++; return session; }, signOut: async () => ({}) };
  if (r === "next/link") return { __esModule: true, default: ({ href, children, ...rest }: any) => React.createElement("a", { href, ...rest }, children) };
  if (r === "@/lib/actions/account-email") return { resetPassword: async (...a: any[]) => { resetCalls.push(a); return resetReply; } };
  if (r === "@/lib/actions/account") return { deleteMyAccount: async () => ({}) };
  if (r === "next/headers") return { headers: () => new Headers({ "x-taita-locale": (globalThis as any).__loc ?? "en" }) };
  if (r === "@/lib/actions/two-step-admin") return { requestTwoStepReset: async (...a: any[]) => { adm.ask.push(a); if (hold) await hold; return adm.reply.ask; }, cancelTwoStepReset: async (...a: any[]) => { adm.cancel.push(a); return adm.reply.cancel; }, cancelResetWithToken: async (...a: any[]) => { adm.link.push(a); if (hold) await hold; return adm.reply.link; } };
  if (r === "@/lib/actions/two-step") return { startTwoStepSetup: async (...a: any[]) => { ts.start.push(a); return ts.reply.start; }, confirmTwoStepSetup: async (...a: any[]) => { ts.confirm.push(a); if (hold) await hold; return ts.reply.confirm; }, makeNewRecoveryCodes: async (...a: any[]) => { ts.renew.push(a); return ts.reply.renew; }, turnOffTwoStep: async (...a: any[]) => { ts.off.push(a); return ts.reply.off; } };
  return origLoad.call(this, r, ...x);
};
const fetchCalls: any[] = []; let fetchReply: any = { ok: true, json: {} };
(globalThis as any).fetch = async (url: string, init: any) => { fetchCalls.push([url, init]); if (hold) await hold; const r = fetchReply; return { ok: r.ok !== false, status: r.status ?? (r.ok === false ? 400 : 200), json: async () => { if (r.bad) throw new Error("not json"); return r.json; } }; };
const { createRoot } = require("react-dom/client"); const { act } = require("react"); const realST = setTimeout;
const flush = () => act(async () => { for (let i = 0; i < 5; i++) await new Promise((r) => realST(r, 5)); });
const q = (s: string) => w.document.querySelector(s) as any; const qa = (s: string) => [...w.document.querySelectorAll(s)] as any[];
let root: any; const mount = async (el: any) => { if (root) await act(async () => root.unmount()); w.document.body.innerHTML = '<div id="root"></div>'; root = createRoot(q("#root")); await act(async () => { root.render(el); }); await flush(); };
const setVal = async (el: any, v: string) => { await act(async () => { Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, "value")!.set!.call(el, v); el.dispatchEvent(new w.Event("input", { bubbles: true })); }); };
const submit = async () => { await act(async () => { q("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); }); await flush(); };
const click = async (el: any, detail = 0) => { await act(async () => { el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true, detail })); }); await flush(); };
const btn = (re: RegExp) => qa("button").find((b: any) => re.test(b.textContent.trim()));
const alertText = () => q('[role="alert"]')?.textContent ?? "";
const reset = () => { pushes.length = 0; refreshes = 0; search = ""; signInReply = {}; session = {}; signInCalls.length = 0; resetCalls.length = 0; resetReply = { ok: true }; fetchCalls.length = 0; fetchReply = { ok: true, json: {} }; hold = null; };
async function main() {
  const { LocaleProvider } = await import("@/lib/i18n/client"); const { trFor } = await import("@/lib/i18n/translate"); const { renderToStaticMarkup } = await import("react-dom/server");
  const Panel = (await import("@/components/admin/TwoStepResetPanel")).default as any; const Form = (await import("@/components/auth/CancelResetForm")).default as any; const Warn = (await import("@/components/admin/SingleSuperAdminWarning")).default as any; const Page = (await import("@/app/two-step/cancel-reset/page")); 
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const P = (el: any, loc = "en") => mount(<LocaleProvider locale={loc as any}>{el}</LocaleProvider>);
  const rs = () => { reset(); adm.ask.length = adm.cancel.length = adm.link.length = 0; adm.reply = {}; };
  const text = () => q("#root").textContent.replace(/\s+/g, " ");
  const iso = (ms: number) => new Date(ms).toISOString();
  const panel = (o: any = {}) => <Panel userId="u9" name="Sam Staff" on available canAct pending={null} {...o} />;
  // ===== the admin panel =====
  rs(); await P(panel({ available: false })); t("NOT SWITCHED ON FOR THE SITE: says so, offers nothing", /has not been switched on for this site yet/.test(text()) && qa("button").length === 0);
  rs(); await P(panel({ on: false })); t("TWO-STEP IS OFF FOR THIS PERSON: it says so and there is nothing to reset (no button)", /off\b/.test(text()) && qa("button").length === 0);
  rs(); await P(panel({ canAct: false })); t("SOMEONE WHO MAY NOT ACT (an ordinary admin, or a super admin viewing themself) SEES THE STATUS BUT NO BUTTONS", /Two-step sign-in is on/.test(text()) && qa("button").length === 0);
  rs(); await P(panel()); await click(btn(/Reset their two-step sign-in/)!);
  t("ASKING FIRST EXPLAINS WHAT WILL HAPPEN, in plain words: only if they lost the phone AND the recovery codes; they are emailed at once with a link to cancel; the other super admins are told; it takes effect 24 hours later at their next sign-in and signs them out; it is audited. And nothing has been asked yet", adm.ask.length === 0 && /lost their phone and their recovery codes/.test(text()) && /emailed at once with a link to cancel/.test(text()) && /other super admins are told/.test(text()) && /24 hours/.test(text()) && /signed out everywhere/.test(text()) && /audit log/.test(text()));
  await click(btn(/Not now/)!); t("'NOT NOW' CLOSES IT with nothing asked", !btn(/Yes, ask for the reset/) && adm.ask.length === 0);
  await click(btn(/Reset their two-step sign-in/)!); adm.reply.ask = { ok: true }; let rel!: () => void; hold = new Promise<void>((r) => { rel = r; }); await click(btn(/Yes, ask for the reset/)!); const lockedBtn = btn(/Asking/); await click(lockedBtn ?? btn(/Asking/)!); rel(); await flush();
  t("CONFIRMING ASKS ONCE FOR THIS PERSON (a double press is one request), locks the button while it works, and refreshes the page to show the waiting request", adm.ask.length === 1 && adm.ask[0].join() === "u9" && !!lockedBtn && refreshes >= 1);
  const codes: [string, RegExp][] = [["no_site_address", /NEXT_PUBLIC_APP_URL/], ["already_pending", /already waiting/], ["self", /use one of your recovery codes/], ["no_two_step", /doesn't have two-step/], ["too_many", /a lot in the last hour/], ["not_allowed", /Only a super admin/], ["unavailable", /has not been switched on/]];
  const said: string[] = []; for (const [c, re] of codes) { rs(); adm.reply.ask = { ok: false, code: c }; await P(panel()); await click(btn(/Reset their two-step sign-in/)!); await click(btn(/Yes, ask for the reset/)!); said.push(`${re.test(alertText()) && refreshes === 0 ? "ok" : "BAD"} ${c}`); }
  t("EVERY REFUSAL IS SAID PLAINLY and the page is not refreshed as if it had worked: " + said.join("; "), said.every((x) => x.startsWith("ok")));
  const NOWMS = Date.now();
  rs(); await P(panel({ pending: { id: "q1", requestedByEmail: "boss@example.org", executeAfter: iso(NOWMS + 20 * 3600000), due: false } }));
  t("A WAITING REQUEST IS SHOWN: who asked, when it takes effect (Nairobi time), that the person was emailed a link to cancel, and a way to cancel; and you cannot start a second one", /A reset is waiting/.test(text()) && /boss@example\.org asked for it/.test(text()) && /Nairobi time/.test(text()) && /emailed a link to cancel/.test(text()) && !!btn(/Cancel the reset/) && !btn(/Reset their two-step sign-in/));
  adm.reply.cancel = { ok: true }; await click(btn(/Cancel the reset/)!); t("CANCELLING asks for THAT request and refreshes", adm.cancel.length === 1 && adm.cancel[0].join() === "q1" && refreshes >= 1);
  rs(); await P(panel({ pending: { id: "q2", requestedByEmail: "boss@example.org", executeAfter: iso(NOWMS - 3600000), due: true } })); t("ONCE THE 24 HOURS ARE UP it says it takes effect the next time they sign in", /The 24 hours are up: it takes effect the next time they sign in/.test(text()));
  rs(); await P(panel({ canAct: false, pending: { id: "q3", requestedByEmail: "boss@example.org", executeAfter: iso(NOWMS + 3600000), due: false } })); t("SOMEONE WHO MAY NOT ACT SEES A WAITING REQUEST BUT HAS NO CANCEL BUTTON", /A reset is waiting/.test(text()) && qa("button").length === 0);
  // ===== the public cancel page =====
  rs(); await P(<Form token="" />); t("WITHOUT A LINK'S SECRET THE PAGE ONLY TELLS THEM TO OPEN THE LINK FROM THEIR EMAIL", /Open the link from your email/.test(text()) && qa("button").length === 0);
  rs(); await P(<Form token="the-secret-token-from-the-email-link" />); await flush(); await new Promise((r) => realST(r, 100));
  t("OPENING THE LINK CANCELS NOTHING (mail scanners and link previews open links): the page asks, with one button, and has not called anything", adm.link.length === 0 && /If you did not expect this, cancel it now\. Nothing has changed yet\./.test(text()) && !!btn(/Cancel the reset/));
  adm.reply.link = { ok: true }; hold = new Promise<void>((r) => { rel = r; }); await click(btn(/Cancel the reset/)!); await click(btn(/Cancelling/) ?? btn(/Cancel the reset/)!); rel(); await flush();
  t("PRESSING THE BUTTON CANCELS ONCE (a double press is one), says nothing has changed, and advises changing the password with a link to do it", adm.link.length === 1 && adm.link[0].join() === "the-secret-token-from-the-email-link" && /The reset was cancelled\. Nothing has changed on your account/.test(text()) && /Change my password/.test(text()) && q("a").getAttribute("href") === "/forgot-password");
  rs(); adm.reply.link = { ok: false, code: "invalid" }; await P(<Form token="used-or-wrong-secret-token-value" />); await click(btn(/Cancel the reset/)!); t("A USED OR WRONG LINK says it is no longer valid and advises changing the password", /This link is no longer valid/.test(alertText() || text()) && /Change my password/.test(text()));
  rs(); adm.reply.link = { ok: false, code: "too_many" }; await P(<Form token="used-or-wrong-secret-token-value" />); await click(btn(/Cancel the reset/)!); t("TOO MANY ATTEMPTS says so", /Too many attempts/.test(text()));
  rs(); adm.reply.link = { ok: true }; await P(<Form token="the-secret-token-from-the-email-link" />, "sw"); const swAsk = text(); await click(btn(new RegExp(trFor("sw", "Cancel the reset")))!); t("THE PAGE IS IN THE PERSON'S LANGUAGE (Kiswahili here), before and after", swAsk.includes(trFor("sw", "A super admin asked to reset the two-step sign-in on your account. If you did not expect this, cancel it now. Nothing has changed yet.")) && text().includes(trFor("sw", "The reset was cancelled. Nothing has changed on your account. As a precaution, change your password.")) && q("a").getAttribute("href") === "/sw/forgot-password");
  (globalThis as any).__loc = "en"; const pg = await Page.default({ searchParams: Promise.resolve({ token: "abc-secret" }) }); const html = renderToStaticMarkup(<LocaleProvider locale="en">{pg}</LocaleProvider>); const meta: any = await Page.generateMetadata();
  t("THE PAGE IS HIDDEN FROM SEARCH AND KEEPS ITS SECRET OUT OF REFERRERS (the secret is in the address): noindex, no follow, no referrer; it shows the form and the heading", meta.robots.index === false && meta.robots.follow === false && meta.referrer === "no-referrer" && /Stop the reset of your two-step sign-in/.test(html) && /Cancel the reset/.test(html) && !html.includes("abc-secret"));
  const htmlNo = renderToStaticMarkup(<LocaleProvider locale="en">{await Page.default({ searchParams: Promise.resolve({}) })}</LocaleProvider>); t("…and with no token at all it only asks them to use the link from their email", /Open the link from your email/.test(htmlNo));
  // ===== the one-super-admin warning =====
  const warn = async (n: any) => { superAdmins = n; const el = await Warn(); return el ? renderToStaticMarkup(el) : ""; };
  const w0 = await warn(0), w1 = await warn(1), w2 = await warn(2), w5 = await warn(5), wd = await warn("down");
  t("THE WARNING: shown for no active super admin or just one (saying so, and why two-step makes it matter, with a link to invite another); not shown for two or more; and a database problem never breaks the page", /There is no active super admin/.test(w0) && /There is only one active super admin/.test(w1) && /Invite a second super admin/.test(w1) && w1.includes('href="/admin/users/new"') && /role="alert"/.test(w1) && w2 === "" && w5 === "" && wd === "");
  const fsx = require("fs"); const srcW = fsx.readFileSync("components/admin/SingleSuperAdminWarning.tsx", "utf8").replace(/\r\n/g, "\n"); t("ONLY ACTIVE SUPER ADMINS COUNT (a suspended one does not), in the query itself", /role: "SUPER_ADMIN", suspendedAt: null/.test(srcW));
  const ap = fsx.readFileSync("app/admin/page.tsx", "utf8").replace(/\r\n/g, "\n"), up = fsx.readFileSync("app/admin/users/page.tsx", "utf8").replace(/\r\n/g, "\n"), dp = fsx.readFileSync("app/admin/users/[id]/page.tsx", "utf8").replace(/\r\n/g, "\n");
  t("IT IS SHOWN ON THE ADMIN HOME AND THE USERS PAGE, and the person's own page carries the reset panel (only offered to a super admin looking at someone else)", /<SingleSuperAdminWarning \/>/.test(ap) && /<SingleSuperAdminWarning \/>/.test(up) && /canAct=\{actor\.role === "SUPER_ADMIN" && actor\.id !== u\.id\}/.test(dp));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} TWO-STEP RESET INTERFACE CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
