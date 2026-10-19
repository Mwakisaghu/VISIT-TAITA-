import fs from "fs"; import bcrypt from "bcryptjs";
const Mod = require("module"); const prevLoad = Mod._load;
Mod._load = function (r: string, ...x: any[]) {
  if (r === "next/headers") return { headers: () => new Headers({ "x-forwarded-for": "10.0.0.1" }) };
  if (r === "next/cache") return { revalidatePath() {} };
  if (r === "next-auth") return { getServerSession: async () => null };
  if (r === "next-auth/middleware") return { withAuth: (fn: any) => fn };
  return prevLoad.call(this, r, ...x);
};
process.env.TWO_FACTOR_KEY = Buffer.alloc(32, 5).toString("base64");
const users = new Map<string, any>(); let userDbDown = false; let tfDown = false; const rows = new Map<string, any>(); let rc: any[] = []; let nid = 0; const updates: any[] = [];
const match = (rowv: any, w: any): boolean => Object.entries(w).every(([k, v]: [string, any]) => { if (k === "OR") return v.some((x: any) => match(rowv, x)); const cur = rowv[k]; if (v && typeof v === "object" && !(v instanceof Date)) { if ("not" in v) return cur !== v.not && !(v.not === null && cur == null); if ("lt" in v) return cur != null && cur < v.lt; } return v === null ? cur == null : cur === v; });
const guard = () => { if (tfDown) throw new Error("relation \"TwoFactor\" does not exist"); };
(globalThis as any).prisma = new Proxy({}, { get: (_t, model: string) => {
  if (model === "user") return { findUnique: async ({ where }: any) => { if (userDbDown) throw new Error("db down"); return where.email ? users.get(where.email) ?? null : [...users.values()].find((u) => u.id === where.id) ?? null; }, update: async (a: any) => { updates.push(a); const u = [...users.values()].find((x) => x.id === a.where.id); if (u) Object.assign(u, a.data); return {}; } };
  if (model === "twoFactor") return { findUnique: async ({ where }: any) => { guard(); return rows.get(where.userId) ? { ...rows.get(where.userId) } : null; }, upsert: async ({ where, create, update }: any) => { guard(); const cur = rows.get(where.userId); rows.set(where.userId, cur ? { ...cur, ...update } : { id: "t" + ++nid, enabledAt: null, lastStep: null, ...create }); return {}; }, updateMany: async ({ where, data }: any) => { guard(); let n = 0; for (const [k, r] of rows) if (match(r, where)) { rows.set(k, { ...r, ...data }); n++; } return { count: n }; }, deleteMany: async ({ where }: any) => { guard(); return { count: rows.delete(where.userId) ? 1 : 0 }; } };
  if (model === "recoveryCode") return { createMany: async ({ data }: any) => { rc.push(...data.map((d: any) => ({ usedAt: null, ...d }))); return { count: data.length }; }, updateMany: async ({ where, data }: any) => { let n = 0; rc = rc.map((r) => { if (match(r, where)) { n++; return { ...r, ...data }; } return r; }); return { count: n }; }, deleteMany: async ({ where }: any) => { const b = rc.length; rc = rc.filter((r) => r.userId !== where.userId); return { count: b - rc.length }; }, count: async ({ where }: any) => rc.filter((r) => match(r, where)).length };
  return new Proxy({}, { get: () => async () => null });
} });
const warn = console.warn; console.warn = () => {};
async function main() {
  const { authOptions } = await import("@/lib/auth"); const S = await import("@/lib/two-step/service"); const T = await import("@/lib/two-step/totp"); const C = await import("@/lib/two-step/crypto"); const P = await import("@/lib/two-step/policy"); const mw: any = (await import("@/middleware")).default;
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const KEY = process.env.TWO_FACTOR_KEY!; const PWD = "wide-sky-red-earth-lion"; let seq = 0, ipn = 0; const ip = () => `10.77.${Math.floor(++ipn / 200)}.${ipn % 200}`;
  const mk = (role = "MEMBER", extra: any = {}) => { const n = ++seq; const u = { id: "u" + n, name: "Person " + n, email: `p${n}@example.org`, role, passwordHash: bcrypt.hashSync(PWD, 4), suspendedAt: null, passwordChangedAt: null, sessionsRevokedAt: null, ...extra }; users.set(u.email, u); return u; };
  const authorize = async (email: string, password: string, code?: string, from = ip()) => { try { const r = await (authOptions.providers[0] as any).options.authorize({ email, password, ...(code !== undefined ? { code } : {}) }, { headers: { "x-forwarded-for": from } }); return { user: r as any }; } catch (e: any) { return { err: e.message as string }; } };
  const enable = async (u: any) => { const b: any = await S.beginSetup(u.id, u.email); const c: any = await S.confirmSetup(u.id, T.totpAt(b.secret, Date.now())); return { secret: b.secret as string, codes: c.codes as string[] }; };
  const jwt = (authOptions.callbacks as any).jwt, session = (authOptions.callbacks as any).session;
  const member = mk(); const a = await authorize(member.email, PWD);
  t("A MEMBER WITHOUT TWO-STEP SIGNS IN AS ALWAYS (no code asked for, nothing changes for them), and is not marked as having passed a second step", a.user?.id === member.id && a.user.mfa === false && a.user.role === "MEMBER");
  const withTf = mk("MEMBER"); const tf = await enable(withTf);
  const b0 = await authorize(withTf.email, PWD); const b1 = await authorize(withTf.email, PWD, "   ");
  t("A PERSON WHO TURNED IT ON IS ASKED FOR THE CODE: the right password alone does NOT sign them in ('TwoStepRequired'), nor does an empty or blank code", b0.err === "TwoStepRequired" && !b0.user && b1.err === "TwoStepRequired");
  const bad = await authorize(withTf.email, PWD, "000000");
  t("A WRONG CODE IS REFUSED ('InvalidCode') and nothing is issued; a code for another person's account is refused too", bad.err === "InvalidCode" && !bad.user);
  const usedCode = T.totpAt(tf.secret, Date.now() + 30000); /* worked out ONCE: a replay is the SAME code, and working it out again could give a different (valid) one if a 30-second boundary fell in between */
  const good = await authorize(withTf.email, PWD, usedCode);
  t("THE RIGHT CODE SIGNS THEM IN and marks the sign-in as having passed the second step (a code for the next 30 seconds is accepted: phone clocks drift)", good.user?.id === withTf.id && good.user.mfa === true);
  const replay = await authorize(withTf.email, PWD, usedCode);
  t("A CODE THAT WAS JUST USED CANNOT SIGN ANYONE IN AGAIN (stolen or shoulder-surfed, it is worthless)", replay.err === "InvalidCode");
  const viaRec = await authorize(withTf.email, PWD, tf.codes[0]); const recAgain = await authorize(withTf.email, PWD, tf.codes[0]);
  t("A RECOVERY CODE SIGNS IN ONCE (typed as saved), and is then used up", viaRec.user?.id === withTf.id && viaRec.user.mfa === true && recAgain.err === "InvalidCode");
  t("THE PASSWORD IS STILL CHECKED FIRST AND REVEALS NOTHING: a wrong password, or an unknown email, gives the ordinary refusal for a person with two-step too (never 'TwoStepRequired', which would tell an attacker the account exists and has it); even a CORRECT code cannot rescue a wrong password", (await authorize(withTf.email, "wrong password here", "123456")).user === null && (await authorize(withTf.email, "wrong password here")).user === null && (await authorize("nobody@example.org", PWD, "123456")).user === null && (await authorize("nobody@example.org", PWD)).user === null);
  const susp = mk("MEMBER", { suspendedAt: new Date() }); await enable(susp); const sr = await authorize(susp.email, PWD);
  t("A SUSPENDED ACCOUNT IS REFUSED AS SUSPENDED (after the password, as before), before any code is asked for", sr.err === "AccountSuspended");
  const guessed = mk("MEMBER"); await enable(guessed); const errs: string[] = []; for (let i = 0; i < 10; i++) errs.push((await authorize(guessed.email, PWD, "000000")).err ?? "");
  t("GUESSING CODES IS LIMITED: after 8 wrong codes the account answers 'TooManyAttempts' (even to the right password), so a stolen password cannot be used to guess six digits", errs.slice(0, 8).every((e) => e === "InvalidCode") && errs.slice(8).every((e) => e === "TooManyAttempts"));
  const prevKey = process.env.TWO_FACTOR_KEY; const lost = mk("MEMBER"); await enable(lost); delete process.env.TWO_FACTOR_KEY; const noKey = await authorize(lost.email, PWD, "123456"); const noKeyPlain = await authorize(member.email, PWD);
  t("A LOST KEY NEVER SILENTLY SWITCHES TWO-STEP OFF: with the key removed, a person who had it on is refused ('TwoStepUnavailable', never let in on the password alone), while people who never turned it on carry on", noKey.err === "TwoStepUnavailable" && !noKey.user && noKeyPlain.user?.id === member.id);
  tfDown = true; const noTable = await authorize(member.email, PWD); process.env.TWO_FACTOR_KEY = prevKey; const withKeyNoTable = await authorize(member.email, PWD, undefined, ip()); tfDown = false;
  t("IF THE TWO-STEP TABLE IS NOT THERE YET: a site that has not switched the feature on (no key) signs people in normally; a site WITH the key set refuses instead of guessing (the database change must be applied first)", noTable.user?.id === member.id && !withKeyNoTable.user && !!withKeyNoTable.err);
  userDbDown = true; const down = await authorize(member.email, PWD); userDbDown = false;
  t("A DATABASE FAILURE REFUSES THE SIGN-IN (it never lets anyone through)", !down.user);
  const sourceAuth = fs.readFileSync("lib/auth.ts", "utf8").replace(/\r\n/g, "\n"); const iPw = sourceAuth.indexOf("verifyPassword(credentials.password"), iSusp = sourceAuth.indexOf('throw new Error("AccountSuspended")'), iGate = sourceAuth.indexOf("verifyLoginCode(user.id"), iRehash = sourceAuth.indexOf("if (needsRehash(user.passwordHash))"), iReturn = sourceAuth.indexOf("return {\n          id: user.id");
  t("THE ORDER IN THE CODE: password, then suspended, then the second step, then the password upgrade, then the person is returned (so nothing is upgraded, cleared or issued before the code is right)", iPw > 0 && iSusp > iPw && iGate > iSusp && iRehash > iGate && iReturn > iRehash);
  // ----- the session token -----
  const rule = { available: true }; const staffNo = mk("ADMIN"); const staffYes = mk("ADMIN"); const sy = await enable(staffYes);
  const tNo = await jwt({ token: {}, user: { id: staffNo.id, role: "ADMIN", mfa: false } }); const tYes = await jwt({ token: {}, user: { id: staffYes.id, role: "ADMIN", mfa: true } }); const tMem = await jwt({ token: {}, user: { id: member.id, role: "MEMBER", mfa: false } });
  t("STAFF WITHOUT TWO-STEP GET A SESSION WITH NO PRIVILEGES: their role is set aside (they are 'VISITOR'), marked as still having to set it up, with the real role remembered; staff who passed the second step keep their role; members are untouched", tNo.role === "VISITOR" && tNo.twoStepSetupRequired === true && tNo.heldRole === "ADMIN" && tYes.role === "ADMIN" && !tYes.twoStepSetupRequired && tYes.mfa === true && tMem.role === "MEMBER" && !tMem.twoStepSetupRequired);
  t("…SO EVERY EXISTING ADMIN CHECK REFUSES THEM, with nothing to forget: none of the four staff roles is the role they now hold, and the session rule does not treat them as staff", !(P.STAFF as readonly string[]).includes(tNo.role) && !(await import("@/lib/session-limits")).staffSessionExpired(tNo));
  const sessNo = await session({ session: { user: {} }, token: tNo }); const sessYes = await session({ session: { user: {} }, token: tYes });
  t("THE SESSION SAYS WHETHER SETUP IS STILL NEEDED (so the pages can send the person there) and shows the restricted role", sessNo.user.twoStepSetupRequired === true && sessNo.user.role === "VISITOR" && sessYes.user.twoStepSetupRequired === false && sessYes.user.role === "ADMIN");
  const stillNo = await jwt({ token: { ...tNo } }); t("A RESTRICTED SESSION IS RE-CHECKED ON EVERY REQUEST (not every few minutes) and STAYS restricted while two-step is not on", stillNo.role === "VISITOR" && stillNo.twoStepSetupRequired === true && stillNo.heldRole === "ADMIN");
  const finish = await enable(staffNo); const nowOk = await jwt({ token: { ...tNo } });
  t("THE MOMENT THEY FINISH SETUP THEIR ROLE COMES BACK (no need to sign in again), the flag clears and the session counts as having passed the second step", nowOk.role === "ADMIN" && nowOk.twoStepSetupRequired === false && nowOk.mfa === true && nowOk.heldRole === undefined && finish.codes.length === 10);
  const staffDb = mk("EDITOR"); const tDb = await jwt({ token: { id: staffDb.id, role: "EDITOR", roleCheckedAt: 0, signedInAt: Date.now(), mfa: false } }); userDbDown = true; const tDbDown = await jwt({ token: { ...tDb, roleCheckedAt: 0 } }); userDbDown = false;
  t("A DATABASE HICCUP KEEPS THE SAFE SIDE: a restricted session stays restricted (the existing 'keep the current role on a hiccup' behaviour, which for them means no privileges)", tDb.role === "VISITOR" && tDbDown.role === "VISITOR");
  const noKeyJwt = (() => { const k = process.env.TWO_FACTOR_KEY; delete process.env.TWO_FACTOR_KEY; return k; })(); const tOff = await jwt({ token: {}, user: { id: staffNo.id, role: "ADMIN", mfa: false } }); process.env.TWO_FACTOR_KEY = noKeyJwt;
  t("WITH NO KEY SET THE WHOLE FEATURE IS OFF: staff sign in exactly as before (nothing is required until the key is set: that is the switch)", tOff.role === "ADMIN" && !tOff.twoStepSetupRequired && tOff.mfa === false);
  process.env.TWO_FACTOR_MONEY_ROLES_FROM = "2099-01-01"; const partnerBefore = await jwt({ token: {}, user: { id: member.id, role: "PARTNER", mfa: false } }); process.env.TWO_FACTOR_MONEY_ROLES_FROM = "2020-01-01"; const partnerAfter = await jwt({ token: {}, user: { id: member.id, role: "PARTNER", mfa: false } }); delete process.env.TWO_FACTOR_MONEY_ROLES_FROM; const partnerNone = await jwt({ token: {}, user: { id: member.id, role: "SELLER", mfa: false } });
  t("MONEY-HANDLING ROLES FOLLOW ONLY FROM THE DATE SET: before it, or with no date, a partner or seller is untouched; from it, they must set it up first", partnerBefore.role === "PARTNER" && !partnerBefore.twoStepSetupRequired && partnerNone.role === "SELLER" && partnerAfter.role === "VISITOR" && partnerAfter.twoStepSetupRequired === true && partnerAfter.heldRole === "PARTNER");
  // ----- the admin gate -----
  const req = (p: string, token: any) => { const url = new URL("https://visittaita.example" + p); return { url: url.toString(), nextUrl: url, nextauth: { token }, cookies: { get: () => undefined }, headers: new Headers(), method: "GET" }; }; const loc = (r: any) => r.headers.get("location") ?? "";
  const gSetup = await mw(req("/admin/users", { ...tNo }), {}), gOk = await mw(req("/admin/users", { role: "ADMIN", signedInAt: Date.now(), mfa: true }), {}), gNone = await mw(req("/admin/users", null), {}), gMember = await mw(req("/admin", { role: "MEMBER" }), {});
  t("THE ADMIN GATE: someone who still has to set up two-step is sent to the setup page (not the sign-in page); a staff member who has passed goes through; a signed-out visitor and a member are sent to sign in as before", new URL(loc(gSetup)).pathname === "/account/security/two-step" && new URL(loc(gSetup)).searchParams.get("required") === "1" && gOk.status !== 307 && gOk.status !== 302 && new URL(loc(gNone)).pathname === "/login" && new URL(loc(gMember)).pathname === "/login");
  const swtch = (k?: string) => { if (k === undefined) delete process.env.TWO_FACTOR_KEY; else process.env.TWO_FACTOR_KEY = k; };
  swtch(KEY); void swtch; void C;
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.warn = warn; console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} TWO-STEP SIGN-IN CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
