import fs from "fs"; import bcrypt from "bcryptjs";
const Mod = require("module"); const prevLoad = Mod._load; let session: any = null; const sent: any[] = []; const audits: any[] = []; const sets: any[] = []; const deletes: string[] = [];
const jar = { set: (name: string, value: string, opts: any) => { sets.push({ name, value, opts }); }, delete: (name: string) => { deletes.push(name); } };
Mod._load = function (r: string, ...x: any[]) {
  if (r === "next/headers") return { headers: async () => new Headers({ "x-forwarded-for": "10.7.7.7" }), cookies: async () => jar };
  if (r === "next/cache") return { revalidatePath() {} };
  if (r === "next-auth") return { getServerSession: async () => session };
  if (r === "@/lib/email") return { ...prevLoad.call(this, r, ...x), sendEmail: async (m: any) => { sent.push(m); return { ok: true }; } };
  return prevLoad.call(this, r, ...x);
};
process.env.TWO_FACTOR_KEY = Buffer.alloc(32, 12).toString("base64");
const users = new Map<string, any>(); const rows = new Map<string, any>(); let rc: any[] = []; const codes: any[] = []; const devices: any[] = []; let nid = 0;
const val = (r: any, k: string, v: any): boolean => { if (k === "OR") return v.some((x: any) => Object.entries(x).every(([kk, vv]) => val(r, kk, vv))); const cur = r[k]; if (v && typeof v === "object" && !(v instanceof Date)) { if ("not" in v) return cur !== v.not && !(v.not === null && cur == null); if ("lt" in v) return cur != null && cur < v.lt; if ("gt" in v) return cur > v.gt; return true; } return v === null ? cur == null : cur === v; };
const match = (r: any, w: any): boolean => Object.entries(w).every(([k, v]) => val(r, k, v));
const apply = (r: any, data: any) => { for (const [k, v] of Object.entries(data) as any) r[k] = v && typeof v === "object" && "increment" in v ? r[k] + v.increment : v; };
(globalThis as any).prisma = new Proxy({}, { get: (_t, model: string) => {
  if (model === "user") return { findUnique: async ({ where }: any) => [...users.values()].find((u) => (where.id ? u.id === where.id : u.email === where.email)) ?? null };
  if (model === "adminAuditLog") return { create: async ({ data }: any) => { audits.push(data); return {}; } };
  if (model === "twoFactor") return { findUnique: async ({ where }: any) => (rows.get(where.userId) ? { ...rows.get(where.userId) } : null), upsert: async ({ where, create, update }: any) => { const cur = rows.get(where.userId); rows.set(where.userId, cur ? { ...cur, ...update } : { id: "t" + ++nid, enabledAt: null, lastStep: null, ...create }); return {}; }, updateMany: async ({ where, data }: any) => { let n = 0; for (const [k, r] of rows) if (match(r, where)) { rows.set(k, { ...r, ...data }); n++; } return { count: n }; }, deleteMany: async ({ where }: any) => ({ count: rows.delete(where.userId) ? 1 : 0 }) };
  if (model === "recoveryCode") return { createMany: async ({ data }: any) => { rc.push(...data.map((d: any) => ({ usedAt: null, ...d }))); return { count: data.length }; }, updateMany: async ({ where, data }: any) => { let n = 0; rc = rc.map((r) => { if (match(r, where)) { n++; return { ...r, ...data }; } return r; }); return { count: n }; }, deleteMany: async ({ where }: any) => { rc = rc.filter((r) => r.userId !== where.userId); return {}; }, count: async ({ where }: any) => rc.filter((r) => match(r, where)).length };
  if (model === "emailCode") return { create: async ({ data }: any) => { codes.push({ id: "c" + ++nid, attempts: 0, usedAt: null, createdAt: new Date(Date.now() + nid), ...data }); return {}; }, findFirst: async ({ where, orderBy }: any) => { const m = codes.filter((r) => match(r, where)); if (orderBy?.createdAt === "desc") m.sort((a, b) => +b.createdAt - +a.createdAt); return m[0] ? { ...m[0] } : null; }, updateMany: async ({ where, data }: any) => { let n = 0; for (const r of codes) if (match(r, where)) { apply(r, data); n++; } return { count: n }; }, deleteMany: async ({ where }: any) => { for (let i = codes.length - 1; i >= 0; i--) if (codes[i].userId === where.userId) codes.splice(i, 1); return {}; } };
  if (model === "trustedDevice") return { create: async ({ data }: any) => { devices.push({ id: "d" + ++nid, lastUsedAt: new Date(), createdAt: new Date(), ...data }); return {}; }, findFirst: async ({ where }: any) => { const m = devices.filter((r) => match(r, where)); return m[0] ? { ...m[0] } : null; }, updateMany: async ({ where, data }: any) => { let n = 0; for (const r of devices) if (match(r, where)) { apply(r, data); n++; } return { count: n }; }, deleteMany: async ({ where }: any) => { for (let i = devices.length - 1; i >= 0; i--) if (devices[i].userId === where.userId && (!where.expiresAt || devices[i].expiresAt < where.expiresAt.lt)) devices.splice(i, 1); return {}; }, count: async ({ where }: any) => devices.filter((r) => match(r, where)).length };
  return new Proxy({}, { get: () => async () => null });
} });
const warn = console.warn; console.warn = () => {};
async function main() {
  const A = await import("@/lib/actions/two-step"); const TA = await import("@/lib/actions/two-step-trust"); const T = await import("@/lib/two-step/totp"); const C = await import("@/lib/two-step/crypto"); const TR = await import("@/lib/two-step/trusted"); const RL = await import("@/lib/rate-limit");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]); const DAY = 86400000;
  let seq = 0; const mk = (role = "MEMBER", extra: any = {}) => { const n = ++seq; const u = { id: "a" + n, name: "Neema Mwadime", email: `neema${n}@example.org`, role, suspendedAt: null, emailVerifiedAt: new Date(), passwordHash: bcrypt.hashSync("wide-sky-red-earth-lion", 4), ...extra }; users.set(u.id, u); return u; };
  const as = (u: any, flags: any = {}) => { session = { user: { id: u.id, role: u.role, ...flags } }; };
  const lastCode = () => (sent[sent.length - 1]?.text.match(/code is: (\d{6})/) ?? [])[1]; const reset = () => { RL.resetRateLimitsForTests(); sent.length = 0; };
  const setupEmail = async (u: any) => { as(u); reset(); await A.startEmailSetup(); const r: any = await A.confirmEmailTwoStepSetup(lastCode()); reset(); return r.codes as string[]; };
  const setupApp = async (u: any) => { as(u); const r: any = await A.startTwoStepSetup(); const sec = C.decryptSecret(rows.get(u.id).secretEnc, C.loadKey()!)!; await A.confirmTwoStepSetup(T.totpAt(sec, Date.now())); return sec; };
  // ===== what the page is told =====
  const m = mk(); as(m); const s0: any = await A.getTwoStepState(); const unv = mk("MEMBER", { emailVerifiedAt: null }); as(unv); const s1: any = await A.getTwoStepState(); const st = mk("ADMIN"); as(st, { twoStepSetupRequired: true }); const s2: any = await A.getTwoStepState();
  t("WHAT THE PAGE IS TOLD: a member with a verified address may choose email and may remember browsers; an unverified address may not choose email; staff may do neither (and are told it is required)", s0.canEmail === true && s0.canTrust === true && s0.method === null && s0.email === m.email && s1.canEmail === false && s1.canTrust === true && s2.canEmail === false && s2.canTrust === false && s2.required === true);
  // ===== email setup =====
  session = null; const n0: any = await A.startEmailSetup(); as(st, { twoStepSetupRequired: true }); const n1: any = await A.startEmailSetup(); as(unv); const n2: any = await A.startEmailSetup();
  t("EMAIL SETUP IS REFUSED: signed out; for staff (never offered); and for an unverified address (a code sent there would prove nothing)", n0.code === "not_signed_in" && n1.code === "not_allowed" && n2.code === "email_not_verified" && rows.size === 0 && sent.length === 0);
  as(m); reset(); const ok1: any = await A.startEmailSetup();
  t("A MEMBER'S EMAIL SETUP SENDS A CODE TO THEIR OWN VERIFIED ADDRESS and tells the page only a MASKED address (never the full one)", ok1.ok === true && /^n•+@example\.org$/.test(ok1.sentTo) && ok1.sentTo !== m.email && sent.length === 1 && sent[0].to === m.email && /^\d{6}$/.test(lastCode()));
  const bad: any = await A.confirmEmailTwoStepSetup(lastCode() === "000000" ? "111111" : "000000"); const good: any = await A.confirmEmailTwoStepSetup(lastCode());
  t("A WRONG CODE IS REFUSED; THE RIGHT ONE TURNS IT ON, returns ten recovery codes, tells the owner by email, and writes an audit entry", bad.code === "wrong_code" && good.ok === true && good.codes.length === 10 && sent.some((x) => /turned on/.test(x.subject)) && audits.some((a) => a.action === "user.twostep_on" && a.targetUserId === m.id) && rows.get(m.id).method === "EMAIL" && !!rows.get(m.id).enabledAt);
  as(st, { twoStepSetupRequired: true }); const sc: any = await A.confirmEmailTwoStepSetup("123456");
  t("STAFF CANNOT CONFIRM AN EMAIL SETUP EITHER", sc.code === "not_allowed");
  const stateOn: any = (as(m), await A.getTwoStepState()); const again: any = await A.startEmailSetup();
  t("ONCE ON, THE STATE SAYS 'EMAIL' (and offers no second setup), and starting again is refused", stateOn.enabled === true && stateOn.method === "EMAIL" && stateOn.canEmail === false && stateOn.recoveryLeft === 10 && again.code === "already_on");
  const key = process.env.TWO_FACTOR_KEY; delete process.env.TWO_FACTOR_KEY; const fresh = mk(); as(fresh); const un: any = await A.startEmailSetup(); process.env.TWO_FACTOR_KEY = key;
  t("WITHOUT A KEY IT IS 'UNAVAILABLE'", un.code === "unavailable");
  // ===== asking for a code to confirm a sensitive change =====
  const app = mk(); await setupApp(app); as(app); reset(); const e0: any = await A.emailMeACode(); as(m); reset(); const e1: any = await A.emailMeACode();
  t("'EMAIL ME A CODE' IS FOR EMAIL-METHOD PEOPLE ONLY (someone on the app is told it is not on for them), and sends a code to their address", e0.code === "not_on" && e1.ok === true && sent.length === 1 && /^\d{6}$/.test(lastCode()));
  const offWithEmail: any = await A.turnOffTwoStep("wide-sky-red-earth-lion", lastCode());
  t("AN EMAIL-METHOD PERSON CAN TURN IT OFF WITH THEIR PASSWORD AND THE EMAILED CODE (and it forgets everything: secret, recovery codes, remembered browsers)", offWithEmail.ok === true && !rows.has(m.id) && rc.every((r) => r.userId !== m.id) && !devices.some((d) => d.userId === m.id));
  // ===== switching to the app for a role that now requires it =====
  const promoted = mk("EDITOR", { emailVerifiedAt: new Date() }); rows.set(promoted.id, { id: "tp", userId: promoted.id, secretEnc: C.encryptSecret("x", C.loadKey()!), enabledAt: new Date(), lastStep: null, method: "EMAIL" }); as(promoted, { twoStepSetupRequired: true }); const sw: any = await A.startTwoStepSetup();
  const member2 = mk(); await setupEmail(member2); as(member2); const sw2: any = await A.startTwoStepSetup();
  t("STAFF WHO HAD CHOSEN EMAIL AS A MEMBER MAY SWITCH TO THE APP (it replaces the email setup); a member on email may NOT replace it this way (they turn it off with proof first)", sw.ok === true && rows.get(promoted.id).method === "TOTP" && !rows.get(promoted.id).enabledAt && sw2.code === "already_on" && rows.get(member2.id).method === "EMAIL");
  // ===== remembering a browser =====
  const rb = mk(); await setupApp(rb); sets.length = 0; reset(); session = null; const r0: any = await TA.rememberThisBrowser(); as(rb); const r1: any = await TA.rememberThisBrowser(); as(rb, { mfa: true, twoStepSetupRequired: true }); const r2: any = await TA.rememberThisBrowser();
  t("A BROWSER IS NOT REMEMBERED UNLESS THIS SESSION REALLY PASSED A SECOND STEP: signed out, a session that did not (mfa missing), and a held session are all refused and set no cookie", [r0, r1, r2].every((r: any) => r.ok === false && r.code === "not_allowed") && sets.length === 0 && devices.length === 0);
  const staff = mk("ADMIN"); await setupApp(staff); as(staff, { mfa: true }); const r3: any = await TA.rememberThisBrowser(); const partner = mk("PARTNER"); await setupApp(partner); as(partner, { mfa: true }); const r4: any = await TA.rememberThisBrowser(); const susp = mk("MEMBER", { suspendedAt: new Date() }); await setupApp(susp); as(susp, { mfa: true }); const r5: any = await TA.rememberThisBrowser(); const noTf = mk(); as(noTf, { mfa: true }); const r6: any = await TA.rememberThisBrowser();
  t("…AND NEVER FOR STAFF OR MONEY-HANDLING ROLES, a suspended account, or someone who has no two-step: all 'not allowed', no cookie, nothing stored", [r3, r4, r5, r6].every((r: any) => r.ok === false && r.code === "not_allowed") && sets.length === 0 && devices.length === 0);
  as(rb, { mfa: true }); const ok: any = await TA.rememberThisBrowser(); const c = sets[0];
  t("A MEMBER WHO PASSED THE SECOND STEP CAN REMEMBER THE BROWSER: the cookie is 'taita-trusted-browser', not readable by scripts (httpOnly), sent only to this site (sameSite lax, path /), expiring in 30 days; the database holds only a fingerprint of its value", ok.ok === true && sets.length === 1 && c.name === "taita-trusted-browser" && c.opts.httpOnly === true && c.opts.sameSite === "lax" && c.opts.path === "/" && Math.abs(+c.opts.expires - (Date.now() + 30 * DAY)) < 60000 && devices.length === 1 && devices[0].tokenHash === TR.hashDeviceToken(c.value) && !JSON.stringify(devices).includes(c.value));
  const prev = process.env.NODE_ENV; (process.env as any).NODE_ENV = "production"; as(rb, { mfa: true }); RL.resetRateLimitsForTests(); sets.length = 0; await TA.rememberThisBrowser(); (process.env as any).NODE_ENV = prev;
  t("IN PRODUCTION THE COOKIE IS 'SECURE' (only sent over https)", sets[0]?.opts.secure === true);
  RL.resetRateLimitsForTests(); let last: any; for (let i = 0; i < 12; i++) { as(rb, { mfa: true }); last = await TA.rememberThisBrowser(); }
  t("REMEMBERING IS LIMITED (10 an hour per person)", last.code === "too_many");
  // ===== forgetting =====
  session = null; const f0: any = await TA.forgetMyBrowsers(); as(rb); deletes.length = 0; const count = devices.filter((d) => d.userId === rb.id).length; const f1: any = await TA.forgetMyBrowsers();
  t("'FORGET MY BROWSERS' needs a signed-in person, ends all of theirs (not other people's), and clears this browser's cookie", f0.ok === false && count >= 1 && f1.ok === true && !devices.some((d) => d.userId === rb.id) && deletes.includes("taita-trusted-browser"));
  const files = ["app", "components", "lib"].flatMap((d) => { const w = (x: string): string[] => fs.readdirSync(x, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === "node_modules" ? [] : w(x + "/" + e.name)) : /\.tsx?$/.test(e.name) ? [x + "/" + e.name] : []); return w(d); }).filter((f) => /cookieJar\.set\(|cookies\(\)\.set|\.cookies\.set\(|document\.cookie\s*=/.test(fs.readFileSync(f, "utf8")));
  const srcT = fs.readFileSync("lib/actions/two-step-trust.ts", "utf8").replace(/\r\n/g, "\n");
  t("THE REMEMBER-THIS-BROWSER COOKIE IS SET IN EXACTLY ONE PLACE (the privacy policy and its guard describe it), the file is 'use server' and only exports async functions, and the refusal checks come before the cookie is set", files.some((f) => f.endsWith("lib/actions/two-step-trust.ts")) && files.filter((f) => !/middleware|LanguageBanner/.test(f)).length === 1 && /^"use server";/.test(srcT) && srcT.split("\n").filter((l) => /^export /.test(l)).every((l) => /^export (async function|type)/.test(l)) && srcT.indexOf("su.mfa !== true") > 0 && srcT.indexOf("su.mfa !== true") < srcT.indexOf("cookieJar.set("));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.warn = warn; console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} MEMBER TWO-STEP ACTION CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
