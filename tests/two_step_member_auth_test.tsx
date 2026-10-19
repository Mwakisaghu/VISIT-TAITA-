import fs from "fs"; import bcrypt from "bcryptjs";
const Mod = require("module"); const prevLoad = Mod._load; const sent: any[] = [];
Mod._load = function (r: string, ...x: any[]) {
  if (r === "next/headers") return { headers: () => new Headers({ "x-forwarded-for": "10.0.0.1" }) };
  if (r === "next/cache") return { revalidatePath() {} };
  if (r === "next-auth") return { getServerSession: async () => null };
  if (r === "next-auth/middleware") return { withAuth: (fn: any) => fn };
  if (r === "@/lib/email") return { ...prevLoad.call(this, r, ...x), sendEmail: async (m: any) => { sent.push(m); return { ok: true }; } };
  return prevLoad.call(this, r, ...x);
};
process.env.TWO_FACTOR_KEY = Buffer.alloc(32, 4).toString("base64");
const users = new Map<string, any>(); const rows = new Map<string, any>(); let rc: any[] = []; const codes: any[] = []; const devices: any[] = []; let nid = 0;
const val = (r: any, k: string, v: any): boolean => { if (k === "OR") return v.some((x: any) => Object.entries(x).every(([kk, vv]) => val(r, kk, vv))); const cur = r[k]; if (v && typeof v === "object" && !(v instanceof Date)) { if ("not" in v) return cur !== v.not && !(v.not === null && cur == null); if ("lt" in v) return cur != null && cur < v.lt; if ("gt" in v) return cur > v.gt; if ("lte" in v) return cur <= v.lte; return true; } return v === null ? cur == null : cur === v; };
const match = (r: any, w: any): boolean => Object.entries(w).every(([k, v]) => val(r, k, v));
const apply = (r: any, data: any) => { for (const [k, v] of Object.entries(data) as any) r[k] = v && typeof v === "object" && "increment" in v ? r[k] + v.increment : v; };
(globalThis as any).prisma = new Proxy({}, { get: (_t, model: string) => {
  if (model === "user") return { findUnique: async ({ where }: any) => (where.email ? users.get(where.email) : [...users.values()].find((u) => u.id === where.id)) ?? null, update: async (a: any) => { const u = [...users.values()].find((x) => x.id === a.where.id); if (u) apply(u, a.data); return {}; } };
  if (model === "twoFactor") return { findUnique: async ({ where }: any) => (rows.get(where.userId) ? { ...rows.get(where.userId) } : null), upsert: async ({ where, create, update }: any) => { const cur = rows.get(where.userId); rows.set(where.userId, cur ? { ...cur, ...update } : { id: "t" + ++nid, enabledAt: null, lastStep: null, ...create }); return {}; }, updateMany: async ({ where, data }: any) => { let n = 0; for (const [k, r] of rows) if (match(r, where)) { rows.set(k, { ...r, ...data }); n++; } return { count: n }; }, deleteMany: async ({ where }: any) => ({ count: rows.delete(where.userId) ? 1 : 0 }) };
  if (model === "recoveryCode") return { createMany: async ({ data }: any) => { rc.push(...data.map((d: any) => ({ usedAt: null, ...d }))); return { count: data.length }; }, updateMany: async ({ where, data }: any) => { let n = 0; rc = rc.map((r) => { if (match(r, where)) { n++; return { ...r, ...data }; } return r; }); return { count: n }; }, deleteMany: async ({ where }: any) => { rc = rc.filter((r) => r.userId !== where.userId); return {}; }, count: async ({ where }: any) => rc.filter((r) => match(r, where)).length };
  if (model === "emailCode") return { create: async ({ data }: any) => { codes.push({ id: "c" + ++nid, attempts: 0, usedAt: null, createdAt: new Date(Date.now() + nid), ...data }); return {}; }, findFirst: async ({ where, orderBy }: any) => { const m = codes.filter((r) => match(r, where)); if (orderBy?.createdAt === "desc") m.sort((a, b) => +b.createdAt - +a.createdAt); return m[0] ? { ...m[0] } : null; }, updateMany: async ({ where, data }: any) => { let n = 0; for (const r of codes) if (match(r, where)) { apply(r, data); n++; } return { count: n }; }, deleteMany: async ({ where }: any) => { for (let i = codes.length - 1; i >= 0; i--) if (codes[i].userId === where.userId) codes.splice(i, 1); return {}; } };
  if (model === "trustedDevice") return { create: async ({ data }: any) => { devices.push({ id: "d" + ++nid, lastUsedAt: new Date(), createdAt: new Date(), ...data }); return {}; }, findFirst: async ({ where }: any) => { const m = devices.filter((r) => match(r, where)); return m[0] ? { ...m[0] } : null; }, updateMany: async ({ where, data }: any) => { let n = 0; for (const r of devices) if (match(r, where)) { apply(r, data); n++; } return { count: n }; }, deleteMany: async ({ where }: any) => { for (let i = devices.length - 1; i >= 0; i--) if (devices[i].userId === where.userId && (!where.expiresAt || devices[i].expiresAt < where.expiresAt.lt)) devices.splice(i, 1); return {}; }, count: async ({ where }: any) => devices.filter((r) => match(r, where)).length };
  return new Proxy({}, { get: () => async () => null });
} });
const warn = console.warn; console.warn = () => {};
async function main() {
  const { authOptions } = await import("@/lib/auth"); const S = await import("@/lib/two-step/service"); const T = await import("@/lib/two-step/totp"); const TR = await import("@/lib/two-step/trusted"); const RL = await import("@/lib/rate-limit");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const PWD = "wide-sky-red-earth-lion"; let seq = 0, ipn = 0; const ip = () => `10.55.${Math.floor(++ipn / 200)}.${ipn % 200}`; const DAY = 86400000;
  const mk = (role = "MEMBER", extra: any = {}) => { const n = ++seq; const u = { id: "m" + n, name: "Person " + n, email: `q${n}@example.org`, role, passwordHash: bcrypt.hashSync(PWD, 4), suspendedAt: null, passwordChangedAt: null, sessionsRevokedAt: null, emailVerifiedAt: new Date(), ...extra }; users.set(u.email, u); return u; };
  const authorize = async (email: string, password: string, code?: string, cookie?: string) => { try { const r = await (authOptions.providers[0] as any).options.authorize({ email, password, ...(code !== undefined ? { code } : {}) }, { headers: { "x-forwarded-for": ip(), ...(cookie ? { cookie } : {}) } }); return { user: r as any }; } catch (e: any) { return { err: e.message as string }; } };
  const lastCode = () => (sent[sent.length - 1]?.text.match(/code is: (\d{6})/) ?? [])[1];
  const enableEmail = async (u: any) => { RL.resetRateLimitsForTests(); await S.beginEmailSetup(u, { mail: async (m) => { sent.push(m); } }); await S.confirmEmailSetup(u.id, lastCode()); RL.resetRateLimitsForTests(); sent.length = 0; };
  const enableTotp = async (u: any) => { const b: any = await S.beginSetup(u.id, u.email); await S.confirmSetup(u.id, T.totpAt(b.secret, Date.now())); return b.secret as string; };
  const jwt = (authOptions.callbacks as any).jwt, session = (authOptions.callbacks as any).session;
  // ===== the email method at sign-in =====
  const e1 = mk(); await enableEmail(e1); const p1 = await authorize(e1.email, PWD);
  t("AN EMAIL-METHOD PERSON'S PASSWORD ALONE DOES NOT SIGN THEM IN: a fresh code is emailed to their own address at once and the page is told to ask for it ('TwoStepEmail')", p1.err === "TwoStepEmail" && sent.length === 1 && sent[0].to === e1.email && /^\d{6}$/.test(lastCode()));
  const c1 = lastCode(); const w1 = await authorize(e1.email, PWD, c1 === "000000" ? "111111" : "000000"); const g1 = await authorize(e1.email, PWD, c1); const r1 = await authorize(e1.email, PWD, c1);
  t("A WRONG EMAILED CODE IS REFUSED; THE RIGHT ONE SIGNS IN, marked as passing the second step by the email method; and used again it is refused", w1.err === "InvalidCode" && g1.user?.id === e1.id && g1.user.mfa === true && g1.user.twoStepMethod === "EMAIL" && r1.err === "InvalidCode");
  RL.resetRateLimitsForTests(); sent.length = 0; const a = await authorize(e1.email, PWD); const first = lastCode(); const b = await authorize(e1.email, PWD); const second = lastCode(); const oldTry = await authorize(e1.email, PWD, first); const newTry = await authorize(e1.email, PWD, second);
  t("ASKING AGAIN EMAILS A NEW CODE AND THE OLD ONE STOPS WORKING", a.err === "TwoStepEmail" && b.err === "TwoStepEmail" && sent.length === 2 && (first === second || oldTry.err === "InvalidCode") && newTry.user?.id === e1.id);
  RL.resetRateLimitsForTests(); sent.length = 0; const e2 = mk(); await enableEmail(e2); const outs: any[] = []; for (let i = 0; i < 5; i++) outs.push((await authorize(e2.email, PWD)).err);
  t("EMAILING IS LIMITED (3 codes in 15 minutes per person): the 4th and 5th attempts send nothing more, and still just ask for the code (an earlier one may still be valid); nobody can use sign-in to flood a person's inbox", outs.every((o) => o === "TwoStepEmail") && sent.length === 3);
  RL.resetRateLimitsForTests(); sent.length = 0; const a1 = mk(); await enableTotp(a1); const pa = await authorize(a1.email, PWD);
  t("SOMEONE ON THE APP IS ASKED FOR THE APP'S CODE ('TwoStepRequired') AND NO EMAIL IS SENT", pa.err === "TwoStepRequired" && sent.length === 0);
  const k = process.env.TWO_FACTOR_KEY; delete process.env.TWO_FACTOR_KEY; RL.resetRateLimitsForTests(); const nk1 = await authorize(e1.email, PWD); const nk2 = await authorize(e1.email, PWD, "123456"); process.env.TWO_FACTOR_KEY = k;
  t("A LOST KEY FAILS SAFE FOR THE EMAIL METHOD TOO: no code can be checked, so a typed code gets 'TwoStepUnavailable' and nobody is let in", nk1.err === "TwoStepEmail" && nk2.err === "TwoStepUnavailable" && !nk2.user);
  // ===== remembered browsers =====
  const m1 = mk(); await enableTotp(m1); const d1: any = await TR.rememberBrowser(m1.id); const cookie = `${TR.TRUST_COOKIE}=${d1.token}`; RL.resetRateLimitsForTests(); sent.length = 0;
  const t0 = await authorize(m1.email, PWD, undefined, cookie), t1 = await authorize(m1.email, PWD), t2 = await authorize(m1.email, PWD, undefined, `${TR.TRUST_COOKIE}=not-the-value`);
  t("A REMEMBERED BROWSER SKIPS THE CODE (the person is signed in on the password alone, marked as having passed the second step); without the cookie, or with a wrong one, the code is asked for", t0.user?.id === m1.id && t0.user.mfa === true && t1.err === "TwoStepRequired" && t2.err === "TwoStepRequired");
  const m2 = mk(); await enableTotp(m2); const t3 = await authorize(m2.email, PWD, undefined, cookie);
  t("ONE PERSON'S COOKIE DOES NOTHING FOR ANOTHER ACCOUNT", t3.err === "TwoStepRequired");
  const t4 = await authorize(m1.email, PWD, "000000", cookie);
  t("A CODE THAT IS TYPED IS ALWAYS CHECKED: a wrong code with a valid remembered browser is refused (the cookie is only used when no code is given)", t4.err === "InvalidCode" && !t4.user);
  const ex = mk(); await enableTotp(ex); const old: any = await TR.rememberBrowser(ex.id, { now: Date.now() - 31 * DAY }); const t5 = await authorize(ex.email, PWD, undefined, `${TR.TRUST_COOKIE}=${old.token}`);
  t("A BROWSER REMEMBERED MORE THAN 30 DAYS AGO IS NOT TRUSTED", t5.err === "TwoStepRequired");
  const pc = mk(); await enableTotp(pc); const pcd: any = await TR.rememberBrowser(pc.id); const pcCookie = `${TR.TRUST_COOKIE}=${pcd.token}`; const before = await authorize(pc.email, PWD, undefined, pcCookie); pc.passwordChangedAt = new Date(Date.now() + 5000); const after = await authorize(pc.email, PWD, undefined, pcCookie);
  t("CHANGING THE PASSWORD ENDS EVERY REMEMBERED BROWSER (it worked before the change; after it, the code is asked for)", before.user?.mfa === true && after.err === "TwoStepRequired");
  const so = mk(); await enableTotp(so); const sod: any = await TR.rememberBrowser(so.id); const soCookie = `${TR.TRUST_COOKIE}=${sod.token}`; so.sessionsRevokedAt = new Date(Date.now() + 5000); const afterSo = await authorize(so.email, PWD, undefined, soCookie);
  t("SIGNING OUT EVERYWHERE ENDS THEM TOO", afterSo.err === "TwoStepRequired");
  const em = mk(); await enableEmail(em); const emd: any = await TR.rememberBrowser(em.id); sent.length = 0; const emTrusted = await authorize(em.email, PWD, undefined, `${TR.TRUST_COOKIE}=${emd.token}`);
  t("A REMEMBERED BROWSER ALSO SKIPS THE EMAILED CODE (and then no email is sent)", emTrusted.user?.id === em.id && sent.length === 0);
  const staff = mk("ADMIN"); const money = mk("PARTNER"); await enableTotp(staff); await enableTotp(money); const sd: any = await TR.rememberBrowser(staff.id); const md: any = await TR.rememberBrowser(money.id);
  const st1 = await authorize(staff.email, PWD, undefined, `${TR.TRUST_COOKIE}=${sd.token}`), st2 = await authorize(money.email, PWD, undefined, `${TR.TRUST_COOKIE}=${md.token}`);
  t("STAFF AND MONEY-HANDLING ROLES ARE NEVER TRUSTED: even if a remembered browser exists for them (for example from before they were promoted), the cookie is ignored and the code is asked for", st1.err === "TwoStepRequired" && st2.err === "TwoStepRequired");
  // ===== the session token =====
  const promoted = mk("ADMIN"); rows.set(promoted.id, { id: "tp", userId: promoted.id, secretEnc: "x", enabledAt: new Date(), lastStep: null, method: "EMAIL" });
  const tEm = await jwt({ token: {}, user: { id: promoted.id, role: "ADMIN", mfa: true, twoStepMethod: "EMAIL" } }); const tMem = await jwt({ token: {}, user: { id: e1.id, role: "MEMBER", mfa: true, twoStepMethod: "EMAIL" } }); const tApp = await jwt({ token: {}, user: { id: staff.id, role: "ADMIN", mfa: true, twoStepMethod: "TOTP" } });
  t("A STAFF MEMBER WHO SIGNED IN WITH AN EMAILED CODE (chosen as a member, promoted later) IS HELD WITH NO PRIVILEGES until they switch to the app; a member on email is fine; staff on the app keep their role", tEm.role === "VISITOR" && tEm.twoStepSetupRequired === true && tEm.heldRole === "ADMIN" && tMem.role === "MEMBER" && !tMem.twoStepSetupRequired && tApp.role === "ADMIN" && !tApp.twoStepSetupRequired);
  const still = await jwt({ token: { ...tEm } }); rows.set(promoted.id, { ...rows.get(promoted.id), method: "TOTP" }); const switched = await jwt({ token: { ...tEm } });
  t("…THE HOLD LASTS WHILE THEIR METHOD IS EMAIL (checked on every request) AND LIFTS THE MOMENT THEY HAVE SWITCHED TO THE APP", still.role === "VISITOR" && still.twoStepSetupRequired === true && switched.role === "ADMIN" && switched.twoStepSetupRequired === false && switched.mfa === true);
  const sess = await session({ session: { user: {} }, token: { mfa: true, role: "MEMBER" } }), sess2 = await session({ session: { user: {} }, token: { role: "MEMBER" } });
  t("THE SESSION SAYS WHETHER THIS SIGN-IN PASSED A SECOND STEP (a browser may be remembered only then)", sess.user.mfa === true && sess2.user.mfa === false);
  const sa = fs.readFileSync("lib/auth.ts", "utf8").replace(/\r\n/g, "\n"); const iReset = sa.indexOf("executeDueReset(user.id"), iTrust = sa.indexOf("isTrustedBrowser(user.id"), iVerify = sa.indexOf("verifyLoginCode(user.id"), iEmail = sa.indexOf("sendEmailCode(user");
  t("THE ORDER IN THE CODE: a due reset, then the remembered-browser check (only when NO code was typed, and only for roles that may be trusted), then the emailed code is sent, then a typed code is verified", iReset > 0 && iTrust > iReset && iEmail > iTrust && iVerify > iEmail && /if \(!typed && canTrustBrowser\(user\.role\)\)/.test(sa));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.warn = warn; console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} MEMBER TWO-STEP SIGN-IN CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
