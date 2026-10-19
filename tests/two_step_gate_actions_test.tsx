import fs from "fs"; import bcrypt from "bcryptjs";
const Mod = require("module"); const prevLoad = Mod._load; let session: any = null; const sent: any[] = []; const audits: any[] = [];
Mod._load = function (r: string, ...x: any[]) {
  if (r === "next/headers") return { headers: async () => new Headers({ "x-forwarded-for": "10.9.9.9" }) };
  if (r === "next/cache") return { revalidatePath() {} };
  if (r === "next/navigation") return { redirect: (u: string) => { throw new Error("REDIRECT " + u); } };
  if (r === "next-auth") return { getServerSession: async () => session };
  if (r === "@/lib/email") return { ...prevLoad.call(this, r, ...x), sendEmail: async (m: any) => { sent.push(m); return { ok: true }; } };
  return prevLoad.call(this, r, ...x);
};
process.env.TWO_FACTOR_KEY = Buffer.alloc(32, 8).toString("base64"); process.env.NEXT_PUBLIC_APP_URL = "https://visittaita.example";
const users = new Map<string, any>(); const rows = new Map<string, any>(); let rc: any[] = []; const resets: any[] = []; let nid = 0;
const val = (rowv: any, k: string, v: any): boolean => { if (k === "OR") return v.some((x: any) => Object.entries(x).every(([kk, vv]) => val(rowv, kk, vv))); const cur = rowv[k]; if (v && typeof v === "object" && !(v instanceof Date)) { if ("not" in v) return cur !== v.not && !(v.not === null && cur == null); if ("lt" in v) return cur != null && cur < v.lt; if ("gt" in v) return cur > v.gt; if ("lte" in v) return cur <= v.lte; return true; } return v === null ? cur == null : cur === v; };
const match = (rowv: any, w: any): boolean => Object.entries(w).every(([k, v]) => val(rowv, k, v));
(globalThis as any).prisma = new Proxy({}, { get: (_t, model: string) => {
  if (model === "user") return { findUnique: async ({ where }: any) => [...users.values()].find((u) => (where.id ? u.id === where.id : u.email === where.email)) ?? null, findMany: async ({ where }: any) => [...users.values()].filter((u) => match(u, where)), update: async ({ where, data }: any) => { Object.assign(users.get(where.id), data); return {}; } };
  if (model === "adminAuditLog") return { create: async ({ data }: any) => { audits.push(data); return {}; } };
  if (model === "twoFactor") return { findUnique: async ({ where }: any) => (rows.get(where.userId) ? { ...rows.get(where.userId) } : null), upsert: async ({ where, create, update }: any) => { const cur = rows.get(where.userId); rows.set(where.userId, cur ? { ...cur, ...update } : { id: "t" + ++nid, enabledAt: null, lastStep: null, ...create }); return {}; }, updateMany: async ({ where, data }: any) => { let n = 0; for (const [k, r] of rows) if (match(r, where)) { rows.set(k, { ...r, ...data }); n++; } return { count: n }; }, deleteMany: async ({ where }: any) => ({ count: rows.delete(where.userId) ? 1 : 0 }) };
  if (model === "recoveryCode") return { createMany: async ({ data }: any) => { rc.push(...data.map((d: any) => ({ usedAt: null, ...d }))); return { count: data.length }; }, updateMany: async () => ({ count: 0 }), deleteMany: async ({ where }: any) => { rc = rc.filter((r) => r.userId !== where.userId); return {}; }, count: async ({ where }: any) => rc.filter((r) => match(r, where)).length };
  if (model === "twoStepReset") return { create: async ({ data }: any) => { const r = { id: "q" + ++nid, cancelledAt: null, cancelledBy: null, completedAt: null, createdAt: new Date(), ...data }; resets.push(r); return { ...r }; }, findFirst: async ({ where }: any) => { const m = resets.filter((r) => match(r, where)); return m[0] ? { ...m[0] } : null; }, updateMany: async ({ where, data }: any) => { let n = 0; for (const r of resets) if (match(r, where)) { Object.assign(r, data); n++; } return { count: n }; } };
  return new Proxy({}, { get: () => async () => null });
} });
const warn = console.warn; console.warn = () => {};
async function main() {
  const { currentManager } = await import("@/lib/user-admin-server"); const { currentBookingUser } = await import("@/lib/booking-auth"); const A = await import("@/lib/actions/two-step-admin"); const S = await import("@/lib/two-step/service"); const T = await import("@/lib/two-step/totp"); const RL = await import("@/lib/rate-limit");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  let seq = 0; const mk = (role: string, extra: any = {}) => { const n = ++seq; const u = { id: "g" + n, name: "Person " + n, email: `g${n}@example.org`, role, suspendedAt: null, emailVerifiedAt: new Date(), passwordHash: "x", ...extra }; users.set(u.id, u); return u; };
  const as = (u: any, flags: any = {}) => { session = { user: { id: u.id, role: u.role, ...flags } }; };
  const enable = async (u: any) => { const b: any = await S.beginSetup(u.id, u.email); await S.confirmSetup(u.id, T.totpAt(b.secret, Date.now())); };
  const sa = mk("SUPER_ADMIN"), sa2 = mk("SUPER_ADMIN"), adm = mk("ADMIN"), ed = mk("EDITOR"), mem = mk("MEMBER"), susp = mk("ADMIN", { suspendedAt: new Date() });
  // ===== the two helpers that read the REAL role from the database =====
  const cm = async (u: any, flags: any = {}) => { as(u, flags); return currentManager(); }; session = null; const signedOut = await currentManager();
  t("THE MANAGER HELPER (used by every user-management action) ACCEPTS ONLY ACTIVE SUPER ADMINS AND ADMINS, read fresh from the database; signed out, editors, members and suspended admins get nothing", !!(await cm(sa)) && !!(await cm(adm)) && (await cm(ed)) === null && (await cm(mem)) === null && (await cm(susp)) === null && signedOut === null && (await cm(sa))!.role === "SUPER_ADMIN");
  t("…AND REFUSES A STAFF MEMBER WHO HAS NOT YET SET UP TWO-STEP even though their database role is admin or super admin (their session is held with no privileges, and server actions are public endpoints that must check this themselves)", (await cm(sa, { twoStepSetupRequired: true })) === null && (await cm(adm, { twoStepSetupRequired: true })) === null && !!(await cm(sa, { twoStepSetupRequired: false })));
  const bu = async (u: any, flags: any = {}) => { as(u, flags); return currentBookingUser(); };
  const b1 = await bu(adm), b2 = await bu(adm, { twoStepSetupRequired: true }), b3 = await bu(ed), b4 = await bu(mem), b5 = await bu(susp);
  t("THE BOOKING HELPER (whose 'isAdmin' guards refunds and acting on any booking) FOLLOWS THE SAME RULE: an admin is an admin; a staff member still setting up two-step is a plain visitor with no admin power; editors and members never are; a suspended admin is nobody", b1?.isAdmin === true && b1.role === "ADMIN" && b2?.isAdmin === false && b2.role === "VISITOR" && b3?.isAdmin === false && b4?.isAdmin === false && b5 === null);
  const srcM = fs.readFileSync("lib/user-admin-server.ts", "utf8").replace(/\r\n/g, "\n"); const srcB = fs.readFileSync("lib/booking-auth.ts", "utf8").replace(/\r\n/g, "\n");
  t("THE CHECK COMES BEFORE ANY ROLE IS TRUSTED (in the code, so a later edit cannot slip a privilege in front of it)", srcM.indexOf("twoStepSetupRequired") > 0 && srcM.indexOf("twoStepSetupRequired") < srcM.indexOf("isManager(a.role)") && srcB.indexOf("held") > 0 && /isAdmin: !held && isManager/.test(srcB));
  // ===== asking for a reset =====
  const target = mk("EDITOR"); await enable(target); const noTf = mk("EDITOR");
  session = null; const q0 = await A.requestTwoStepReset(target.id); as(adm); const q1 = await A.requestTwoStepReset(target.id); as(sa, { twoStepSetupRequired: true }); const q2 = await A.requestTwoStepReset(target.id); as(ed); const q3 = await A.requestTwoStepReset(target.id);
  t("ONLY A SUPER ADMIN WHO IS FULLY SIGNED IN MAY ASK: signed out, an ordinary admin, a super admin still setting up two-step, and an editor are all 'not allowed' and nothing is created", [q0, q1, q2, q3].every((q: any) => q.ok === false && q.code === "not_allowed") && resets.length === 0 && sent.length === 0);
  as(sa); const q4: any = await A.requestTwoStepReset("nobody"), q5: any = await A.requestTwoStepReset(noTf.id), q6: any = await A.requestTwoStepReset(sa.id);
  t("A SUPER ADMIN IS REFUSED FOR: an unknown person, someone without two-step, and themselves", q4.code === "not_found" && q5.code === "no_two_step" && q6.code === "self" && resets.length === 0);
  sent.length = 0; const ok1: any = await A.requestTwoStepReset(target.id);
  t("A VALID REQUEST: is created, the person is emailed the cancel link (with the site's public address), the other super admin is told without the link, and it is audited", ok1.ok === true && resets.length === 1 && sent.some((m) => m.to === target.email && m.text.includes("https://visittaita.example/two-step/cancel-reset?token=")) && sent.some((m) => m.to === sa2.email && !/token=/.test(m.text)) && audits.some((a) => a.action === "user.twostep_reset_requested" && a.actorEmail === sa.email));
  const dup: any = await A.requestTwoStepReset(target.id); t("A SECOND REQUEST WHILE ONE WAITS IS REFUSED", dup.code === "already_pending" && resets.length === 1);
  const key = process.env.TWO_FACTOR_KEY; delete process.env.TWO_FACTOR_KEY; const un: any = await A.requestTwoStepReset(target.id); process.env.TWO_FACTOR_KEY = key; const url = process.env.NEXT_PUBLIC_APP_URL; delete process.env.NEXT_PUBLIC_APP_URL; delete process.env.NEXTAUTH_URL; const t2 = mk("EDITOR"); await enable(t2); const na: any = await A.requestTwoStepReset(t2.id); process.env.NEXT_PUBLIC_APP_URL = url;
  t("WITHOUT THE KEY IT IS 'UNAVAILABLE'; WITHOUT A PUBLIC SITE ADDRESS NOTHING STARTS (the cancel link is what makes it safe)", un.code === "unavailable" && na.code === "no_site_address" && !resets.some((r) => r.userId === t2.id));
  RL.resetRateLimitsForTests(); as(sa2); let last: any; const many = mk("EDITOR"); await enable(many); for (let i = 0; i < 12; i++) last = await A.requestTwoStepReset("nobody-" + i);
  t("ASKING IS LIMITED (10 an hour per super admin)", last.code === "too_many");
  // ===== cancelling =====
  const rid = resets[0].id; as(adm); const c0: any = await A.cancelTwoStepReset(rid); RL.resetRateLimitsForTests(); as(sa); const c1: any = await A.cancelTwoStepReset(rid); const c2: any = await A.cancelTwoStepReset(rid);
  t("ANY SUPER ADMIN CAN CANCEL, an ordinary admin cannot, and a second cancel is 'invalid'; the person is told", c0.code === "not_allowed" && c1.ok === true && c2.code === "invalid" && resets[0].cancelledBy === sa.email && sent.some((m) => m.to === target.email && /was cancelled/.test(m.subject)));
  RL.resetRateLimitsForTests(); as(sa); sent.length = 0; await A.requestTwoStepReset(target.id); const link = sent.find((m) => m.to === target.email).text.match(/token=([^\s]+)/)[1]; session = null;
  const l0: any = await A.cancelResetWithToken("garbage-garbage-garbage-garbage"), l1: any = await A.cancelResetWithToken(decodeURIComponent(link)), l2: any = await A.cancelResetWithToken(decodeURIComponent(link));
  t("THE EMAILED LINK WORKS WITHOUT SIGNING IN (the person may be locked out), once; a wrong or used link both just say 'invalid'", l0.code === "invalid" && l1.ok === true && l2.code === "invalid" && resets[resets.length - 1].cancelledBy === "the account owner (email link)");
  RL.resetRateLimitsForTests(); let lastLink: any; for (let i = 0; i < 22; i++) lastLink = await A.cancelResetWithToken("garbage-" + i + "-garbage-garbage-garbage");
  t("GUESSING LINKS IS LIMITED BY CONNECTION (20 an hour), then 'too many'", lastLink.code === "too_many");
  const srcA = fs.readFileSync("lib/actions/two-step-admin.ts", "utf8").replace(/\r\n/g, "\n");
  t("THE ADMIN ACTIONS FILE ONLY EXPORTS ASYNC FUNCTIONS AND TYPES, is a 'use server' file, and every action that needs a super admin goes through the manager helper (never the session's own role)", /^"use server";/.test(srcA) && srcA.split("\n").filter((l) => /^export /.test(l)).every((l) => /^export (async function|type)/.test(l)) && (srcA.match(/await currentManager\(\)/g) ?? []).length === 2 && !/session\.user\.role/.test(srcA));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.warn = warn; console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} TWO-STEP GATE AND ADMIN ACTION CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
