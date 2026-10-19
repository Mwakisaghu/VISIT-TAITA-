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
const resets: any[] = []; let resetDown = false; let resetQueries = 0; const users = new Map<string, any>(); let userDbDown = false; let tfDown = false; const rows = new Map<string, any>(); let rc: any[] = []; let nid = 0; const updates: any[] = [];
const match = (rowv: any, w: any): boolean => Object.entries(w).every(([k, v]: [string, any]) => { if (k === "OR") return v.some((x: any) => match(rowv, x)); const cur = rowv[k]; if (v && typeof v === "object" && !(v instanceof Date)) { if ("not" in v) return cur !== v.not && !(v.not === null && cur == null); if ("lt" in v) return cur != null && cur < v.lt; } return v === null ? cur == null : cur === v; });
const audits: any[] = []; const matchR = (r: any, w: any): boolean => Object.entries(w).every(([k, v]: [string, any]) => { const cur = r[k]; if (v && typeof v === "object" && !(v instanceof Date)) { if ("gt" in v && !(cur > v.gt)) return false; if ("lte" in v && !(cur <= v.lte)) return false; return true; } return v === null ? cur == null : cur === v; });
const guard = () => { if (tfDown) throw new Error("relation \"TwoFactor\" does not exist"); };
(globalThis as any).prisma = new Proxy({}, { get: (_t, model: string) => {
  if (model === "user") return { findUnique: async ({ where }: any) => { if (userDbDown) throw new Error("db down"); return where.email ? users.get(where.email) ?? null : [...users.values()].find((u) => u.id === where.id) ?? null; }, update: async (a: any) => { updates.push(a); const u = [...users.values()].find((x) => x.id === a.where.id); if (u) Object.assign(u, a.data); return {}; } };
  if (model === "twoFactor") return { findUnique: async ({ where }: any) => { guard(); return rows.get(where.userId) ? { ...rows.get(where.userId) } : null; }, upsert: async ({ where, create, update }: any) => { guard(); const cur = rows.get(where.userId); rows.set(where.userId, cur ? { ...cur, ...update } : { id: "t" + ++nid, enabledAt: null, lastStep: null, ...create }); return {}; }, updateMany: async ({ where, data }: any) => { guard(); let n = 0; for (const [k, r] of rows) if (match(r, where)) { rows.set(k, { ...r, ...data }); n++; } return { count: n }; }, deleteMany: async ({ where }: any) => { guard(); return { count: rows.delete(where.userId) ? 1 : 0 }; } };
  if (model === "twoStepReset") return { findFirst: async ({ where }: any) => { resetQueries++; if (resetDown) throw new Error("relation \"TwoStepReset\" does not exist"); const m = resets.filter((r) => matchR(r, where)); return m[0] ? { ...m[0] } : null; }, updateMany: async ({ where, data }: any) => { if (resetDown) throw new Error("down"); let n = 0; for (const r of resets) if (matchR(r, where)) { Object.assign(r, data); n++; } return { count: n }; } };
  if (model === "adminAuditLog") return { create: async ({ data }: any) => { audits.push(data); return {}; } };
  if (model === "recoveryCode") return { createMany: async ({ data }: any) => { rc.push(...data.map((d: any) => ({ usedAt: null, ...d }))); return { count: data.length }; }, updateMany: async ({ where, data }: any) => { let n = 0; rc = rc.map((r) => { if (match(r, where)) { n++; return { ...r, ...data }; } return r; }); return { count: n }; }, deleteMany: async ({ where }: any) => { const b = rc.length; rc = rc.filter((r) => r.userId !== where.userId); return { count: b - rc.length }; }, count: async ({ where }: any) => rc.filter((r) => match(r, where)).length };
  return new Proxy({}, { get: () => async () => null });
} });
const warn = console.warn; console.warn = () => {};
async function main() {
  const { authOptions } = await import("@/lib/auth"); const S = await import("@/lib/two-step/service"); const T = await import("@/lib/two-step/totp");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const PWD = "wide-sky-red-earth-lion"; let seq = 0, ipn = 0; const ip = () => `10.88.${Math.floor(++ipn / 200)}.${ipn % 200}`; const NOW = Date.now(); const H = 3600000, D = 24 * H;
  const mk = (role = "MEMBER", extra: any = {}) => { const n = ++seq; const u = { id: "u" + n, name: "Person " + n, email: `r${n}@example.org`, role, passwordHash: bcrypt.hashSync(PWD, 4), suspendedAt: null, passwordChangedAt: null, sessionsRevokedAt: null, ...extra }; users.set(u.email, u); return u; };
  const authorize = async (email: string, password: string, code?: string) => { try { const r = await (authOptions.providers[0] as any).options.authorize({ email, password, ...(code !== undefined ? { code } : {}) }, { headers: { "x-forwarded-for": ip() } }); return { user: r as any }; } catch (e: any) { return { err: e.message as string }; } };
  const enable = async (u: any) => { const b: any = await S.beginSetup(u.id, u.email); await S.confirmSetup(u.id, T.totpAt(b.secret, Date.now())); return b.secret as string; };
  const ask = (u: any, over: any = {}) => { const r = { id: "q" + (resets.length + 1), userId: u.id, requestedById: "sa", requestedByEmail: "sa@example.org", executeAfter: new Date(NOW + D), cancelTokenHash: "h" + resets.length, cancelledAt: null, cancelledBy: null, completedAt: null, createdAt: new Date(), ...over }; resets.push(r); return r; };
  const jwt = (authOptions.callbacks as any).jwt;
  // ===== a request that is due takes effect at the next sign-in =====
  const m1 = mk("MEMBER"); await enable(m1); ask(m1, { executeAfter: new Date(NOW - H) });
  const r1 = await authorize(m1.email, PWD);
  t("A DUE RESET TAKES EFFECT AT THE NEXT SIGN-IN: after the password is proved the person is signed in WITHOUT a code (their second step is gone), it is marked done, their sign-ins elsewhere are ended, and the audit log says so", r1.user?.id === m1.id && r1.user.mfa === false && resets[0].completedAt && !(await S.twoStepEnabled(m1.id)) && users.get(m1.email).sessionsRevokedAt instanceof Date && audits.some((a) => a.action === "user.twostep_reset_done" && a.targetUserId === m1.id));
  const m2 = mk("MEMBER"); const s2 = await enable(m2); ask(m2, { executeAfter: new Date(NOW + 2 * H) });
  const r2 = await authorize(m2.email, PWD);
  t("BEFORE IT IS DUE THE CODE IS STILL REQUIRED (the person has 24 hours to cancel): the password alone does not sign them in, and a correct code does", r2.err === "TwoStepRequired" && (await S.twoStepEnabled(m2.id)) === true && !resets[1].completedAt && (await authorize(m2.email, PWD, T.totpAt(s2, Date.now() + 30000))).user?.mfa === true);
  const m3 = mk("MEMBER"); await enable(m3); ask(m3, { executeAfter: new Date(NOW - H) }); const before = JSON.stringify(resets[2]);
  const bad = await authorize(m3.email, "wrong password at all"); const unknown = await authorize("nobody@example.org", PWD);
  t("A WRONG PASSWORD NEVER TRIGGERS IT (nothing changes, nothing leaks): the request stays waiting, the second step stays on, and an unknown address behaves the same", bad.user === null && unknown.user === null && JSON.stringify(resets[2]) === before && (await S.twoStepEnabled(m3.id)) === true);
  const st = mk("EDITOR"); await enable(st); ask(st, { executeAfter: new Date(NOW - H) }); const rs = await authorize(st.email, PWD); const tok = await jwt({ token: {}, user: { id: st.id, role: "EDITOR", mfa: rs.user?.mfa } });
  t("FOR STAFF, A RESET MEANS SETTING IT UP AGAIN: after it takes effect they are signed in but held at a session with no privileges until they set two-step up once more", rs.user?.mfa === false && tok.role === "VISITOR" && tok.twoStepSetupRequired === true && tok.heldRole === "EDITOR");
  const m4 = mk("MEMBER"); await enable(m4); ask(m4, { executeAfter: new Date(NOW - H), cancelledAt: new Date(NOW - 2 * H) }); const m5 = mk("MEMBER"); await enable(m5); ask(m5, { executeAfter: new Date(NOW - 9 * D) }); const m6 = mk("MEMBER"); await enable(m6); ask(m6, { executeAfter: new Date(NOW - H), completedAt: new Date(NOW - H) });
  const a4 = await authorize(m4.email, PWD), a5 = await authorize(m5.email, PWD), a6 = await authorize(m6.email, PWD);
  t("A CANCELLED REQUEST, ONE MORE THAN A WEEK OVERDUE, AND ONE ALREADY DONE DO NOTHING: all three still need their code", [a4, a5, a6].every((a) => a.err === "TwoStepRequired") && [m4, m5, m6].every((m) => true));
  const m7 = mk("MEMBER", { suspendedAt: new Date() }); await enable(m7); ask(m7, { executeAfter: new Date(NOW - H) }); const a7 = await authorize(m7.email, PWD);
  t("A SUSPENDED ACCOUNT IS REFUSED AS SUSPENDED, and its due request is not applied behind the scenes", a7.err === "AccountSuspended" && !resets[resets.length - 1].completedAt && (await S.twoStepEnabled(m7.id)) === true);
  const m8 = mk("MEMBER"); await enable(m8); ask(m8, { executeAfter: new Date(NOW - H) }); const m9 = mk("MEMBER"); resetDown = true; const d8 = await authorize(m8.email, PWD), d9 = await authorize(m9.email, PWD); resetDown = false;
  t("IF THE RESET TABLE IS MISSING OR BROKEN, SIGN-IN IS NEVER BLOCKED OR WEAKENED: someone without two-step signs in as normal, and someone WITH it is still asked for the code (the reset simply does not happen)", d9.user?.id === m9.id && d8.err === "TwoStepRequired" && !resets[resets.length - 2].completedAt && (await S.twoStepEnabled(m8.id)) === true);
  const key = process.env.TWO_FACTOR_KEY; delete process.env.TWO_FACTOR_KEY; const before2 = resetQueries; const m10 = mk("MEMBER"); const a10 = await authorize(m10.email, PWD); process.env.TWO_FACTOR_KEY = key;
  t("WITH NO KEY (the feature off) THE RESET TABLE IS NEVER EVEN ASKED ABOUT: sign-in does exactly what it always did", a10.user?.id === m10.id && resetQueries === before2);
  const sa = fs.readFileSync("lib/auth.ts", "utf8").replace(/\r\n/g, "\n"); const iSusp = sa.indexOf('throw new Error("AccountSuspended")'), iReset = sa.indexOf("executeDueReset(user.id"), iEn = sa.indexOf("enabled = await twoStepEnabled(user.id)"), iPw = sa.indexOf("verifyPassword(credentials.password");
  t("THE ORDER IN THE CODE: password proved, suspended refused, THEN the due reset is applied, THEN the second step is checked; and it is wrapped so a failure never escapes", iPw > 0 && iSusp > iPw && iReset > iSusp && iEn > iReset && /try \{ await executeDueReset\(user\.id, \{ mail: sendEmail \}\); \} catch \{/.test(sa) && /if \(twoStepAvailable\(\)\) \{ try \{ await executeDueReset/.test(sa));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.warn = warn; console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} TWO-STEP RESET SIGN-IN CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
