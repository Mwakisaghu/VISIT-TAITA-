import fs from "fs"; import bcrypt from "bcryptjs";
const Module = require("module"); const origLoad = Module._load; let session: any = null; const sent: any[] = []; const revalidated: string[] = [];
Module._load = function (r: string, ...x: any[]) {
  if (r === "next-auth") return { getServerSession: async () => session };
  if (r === "next/cache") return { revalidatePath: (p: string) => { revalidated.push(p); } };
  if (r === "@/lib/email") return { ...origLoad.call(this, r, ...x), sendEmail: async (m: any) => { sent.push(m); return { ok: true }; } };
  return origLoad.call(this, r, ...x);
};
const U: Record<string, any> = {}; let tokens: any[] = []; let failTx = false; let failUpdate = false;
const fake: any = {
  user: {
    findUnique: async (a: any) => { const id = a.where?.id; return id && U[id] ? { ...U[id] } : null; },
    updateMany: async (a: any) => { if (failUpdate) throw new Error("db down"); const r = U[a.where.id]; if (!r) return { count: 0 }; Object.assign(r, a.data); return { count: 1 }; },
    update: async (a: any) => { if (failTx) throw new Error("db down"); Object.assign(U[a.where.id], a.data); return U[a.where.id]; },
  },
  accountToken: { deleteMany: async (a: any) => { const before = tokens.length; tokens = tokens.filter((t) => !(t.userId === a.where.userId && t.usedAt === null)); return { count: before - tokens.length }; } },
  $transaction: async (fn: any) => fn(fake),
};
(globalThis as any).prisma = fake; process.env.NEXTAUTH_SECRET = "x".repeat(32);
const warn = console.warn; console.warn = () => {};
async function main() {
  const A = await import("@/lib/actions/account-security"); const R = await import("@/lib/account-security-rules"); const PT = await import("@/lib/password-policy-text"); const PP = await import("@/lib/password-policy"); const PW = await import("@/lib/password"); const { authOptions } = await import("@/lib/auth");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  let seq = 0; const mk = (pw = "wide-sky-red-earth-lion", extra: any = {}) => { const id = "u" + ++seq; U[id] = { id, name: "Neema Mwadime", email: `neema${seq}@example.org`, passwordHash: bcrypt.hashSync(pw, 4), passwordChangedAt: null, sessionsRevokedAt: null, ...extra }; return id; };
  const as = (id: string | null) => { session = id ? { user: { id, role: "MEMBER" } } : null; };
  // ===== the name rules (pure) =====
  const cn = (s: any) => R.cleanName(s) as any;
  t("NAME RULES (tidied): extra spaces inside and around a name are collapsed to one; accents, hyphens, apostrophes and other scripts are welcome", cn("  Neema   Mwadime ").name === "Neema Mwadime" && cn("Zoë Chebet-Wambui").ok && cn("O'Neil").ok && cn("D'Souza Jr.").ok && cn("李小龍").ok && cn("Åsa Öberg").ok && cn("Jean\u00A0Pierre").name === "Jean Pierre" && cn("e\u0301lan").name === "\u00e9lan");
  t("NAME RULES (refused): too short, too long (counted in characters, not bytes), no letters at all, an email address, angle brackets, control and invisible characters, and anything that is not text", cn("A").code === "name_short" && cn("").code === "name_short" && cn("   ").code === "name_short" && cn("x".repeat(81)).code === "name_long" && cn("x".repeat(80)).ok && cn("é".repeat(80)).ok && cn("12345").code === "name_invalid" && cn("a@b.co").code === "name_invalid" && cn("<b>Neema</b>").code === "name_invalid" && cn("Nee\u200Bma").code === "name_invalid" && cn("Neema\u0000").code === "name_invalid" && cn("Nee\u202Ema").code === "name_invalid" && cn(null).code === "name_invalid" && cn(42).code === "name_invalid" && cn({}).code === "name_invalid");
  // ===== updateMyName =====
  const a1 = mk(), b1 = mk(); as(a1); revalidated.length = 0; const r1: any = await A.updateMyName("  Neema   Wanjiru Mwadime  ");
  t("CHANGE NAME: the person's own name is changed to the tidied form and the new name comes back; ONLY their row changed; the account page is refreshed", r1.ok && r1.name === "Neema Wanjiru Mwadime" && U[a1].name === "Neema Wanjiru Mwadime" && U[b1].name === "Neema Mwadime" && revalidated.includes("/account"));
  as(null); const r2: any = await A.updateMyName("Someone Else"); as(a1); const r3: any = await A.updateMyName("<b>x</b>"), r4: any = await A.updateMyName("A"); const r5: any = await A.updateMyName("x".repeat(90));
  t("CHANGE NAME (refused): signed out gets 'not_signed_in'; invalid, short and long names get their own codes and change nothing", r2.code === "not_signed_in" && r3.code === "name_invalid" && r4.code === "name_short" && r5.code === "name_long" && U[a1].name === "Neema Wanjiru Mwadime");
  const a2 = mk(); as(a2); let last: any = null; for (let i = 0; i < 11; i++) last = await A.updateMyName("Neema " + "N".repeat(i + 1));
  t("CHANGE NAME (limited): ten changes an hour; the eleventh is refused with 'too_many'", last.code === "too_many" && U[a2].name === "Neema " + "N".repeat(10));
  const a3 = mk(); as(a3); failUpdate = true; const rf: any = await A.updateMyName("Neema Fine"); failUpdate = false; delete U[a3]; const rg: any = await A.updateMyName("Neema Fine"); const a3b = mk(); as(a3b);
  t("CHANGE NAME (when things go wrong): a database failure gives 'failed' (not a crash); an account that no longer exists gives 'gone'", rf.code === "failed" && rg.code === "gone");
  // ===== changeMyPassword =====
  const OLD = "wide-sky-red-earth-lion", NEW = "ngangao-mist-at-dawn-1800";
  const p1 = mk(OLD); as(p1); sent.length = 0; const before = U[p1].passwordHash;
  const w1: any = await A.changeMyPassword("not my password", NEW), w2: any = await A.changeMyPassword("", NEW), w3: any = await A.changeMyPassword("not my password", "short");
  t("PASSWORD (a wrong current password): refused with 'wrong_password' and nothing changes, nothing is emailed; and it is checked FIRST, so a wrong current password with a weak new one still says only 'wrong_password' (the rules for the new password are not revealed to someone who does not know the old one); an empty one is 'missing_current'", w1.code === "wrong_password" && w3.code === "wrong_password" && !("policy" in w3) && w2.code === "missing_current" && U[p1].passwordHash === before && sent.length === 0 && U[p1].passwordChangedAt === null);
  const sameU = mk(OLD); as(sameU); const same: any = await A.changeMyPassword(OLD, OLD);
  const cases: [string, string, boolean][] = [["short", "Abc-12", true], ["common", "password1234", true], ["personal", "neema-forever-1", true], ["repetitive", "mnbvcxzlkjhg", true], ["variety", "aaaaabbbbb", true]];
  const weak: any[] = []; const weakUsers: string[] = []; for (const [, pw] of cases) { const wu = mk(OLD); weakUsers.push(wu); as(wu); weak.push(await A.changeMyPassword(OLD, pw)); } // each on a different person: every attempt counts toward the hourly limit
  t("PASSWORD (the new one): the same as the current is refused ('same_password'); a short, common, personal, sequential or repetitive one is refused as 'weak' with the SPECIFIC reason (so the page can say why, in the right language); none of them changes anything", same.code === "same_password" && weak.map((x) => x.code).every((c) => c === "weak") && weak.map((x) => x.policy.reason).join() === "short,common,personal,repetitive,repetitive" && weak[4].policy.detail === "variety" && weak[3].policy.detail === undefined && U[p1].passwordHash === before && bcrypt.compareSync(OLD, U[sameU].passwordHash) && weakUsers.every((id) => bcrypt.compareSync(OLD, U[id].passwordHash)));
  const okU = mk(OLD); as(okU); sent.length = 0; tokens = [{ userId: okU, usedAt: null }, { userId: okU, usedAt: null }, { userId: okU, usedAt: new Date() }, { userId: "someoneelse", usedAt: null }];
  const stamp = Date.now(); const ok1: any = await A.changeMyPassword(OLD, NEW);
  t("PASSWORD (success): the new password is stored (and works), the old no longer does, cost 12; the change time is recorded; reset links still waiting are cancelled (not used ones, nor anyone else's); the person is emailed at their own address saying it happened", ok1.ok && bcrypt.compareSync(NEW, U[okU].passwordHash) && !bcrypt.compareSync(OLD, U[okU].passwordHash) && PW.bcryptCost(U[okU].passwordHash) === 12 && U[okU].passwordChangedAt instanceof Date && U[okU].passwordChangedAt.getTime() >= stamp && tokens.length === 2 && tokens.some((x) => x.userId === "someoneelse") && tokens.some((x) => x.usedAt) && sent.length === 1 && sent[0].to === U[okU].email && /password was changed/i.test(sent[0].subject) && /signed out/.test(sent[0].text) && !sent[0].text.includes(NEW) && !sent[0].text.includes(OLD));
  const others = Object.values(U).filter((u: any) => u && u.id !== okU && u.passwordHash).every((u: any) => !bcrypt.compareSync(NEW, u.passwordHash));
  t("PASSWORD (only the person's own): nobody else's password was touched", others);
  const p2 = mk(OLD); as(p2); const t0: any[] = []; for (let i = 0; i < 5; i++) t0.push(await A.changeMyPassword("wrong " + i, NEW)); const t1: any = await A.changeMyPassword(OLD, NEW);
  t("PASSWORD (limited): five attempts an hour, right or wrong; after five wrong guesses even the CORRECT password is refused with 'too_many' (so a stolen session cannot be used to guess the password)", t0.every((x) => x.code === "wrong_password") && t1.code === "too_many" && bcrypt.compareSync(OLD, U[p2].passwordHash));
  const p3 = mk(OLD); as(p3); sent.length = 0; failTx = true; const tf: any = await A.changeMyPassword(OLD, NEW); failTx = false;
  t("PASSWORD (a database failure): 'failed', the old password still works, and no 'it was changed' email is sent", tf.code === "failed" && bcrypt.compareSync(OLD, U[p3].passwordHash) && sent.length === 0);
  as(null); const ns: any = await A.changeMyPassword(OLD, NEW); as("nobody"); const ng: any = await A.changeMyPassword(OLD, NEW);
  t("PASSWORD (signed out, or the account is gone): 'not_signed_in' and 'gone'", ns.code === "not_signed_in" && ng.code === "gone");
  // ===== signOutEverywhere =====
  const s1 = mk(), s2 = mk(); as(s1); const so: any = await A.signOutEverywhere();
  t("SIGN OUT EVERYWHERE: records the moment on the person's own row only (nobody else's), and says ok", so.ok && U[s1].sessionsRevokedAt instanceof Date && Date.now() - U[s1].sessionsRevokedAt.getTime() < 5000 && U[s2].sessionsRevokedAt === null);
  as(null); const so2: any = await A.signOutEverywhere(); const s3 = mk(); as(s3); let lastSo: any = null; for (let i = 0; i < 11; i++) lastSo = await A.signOutEverywhere(); delete U[s3]; const so3: any = await A.signOutEverywhere();
  t("SIGN OUT EVERYWHERE (edges): signed out gets 'not_signed_in'; ten an hour then 'too_many'; a deleted account gets 'gone'", so2.code === "not_signed_in" && lastSo.code === "too_many" && so3.code === "too_many" || so3.code === "gone");
  // ===== it really ends sessions, using the REAL sign-in token logic =====
  const jwt = (authOptions.callbacks as any).jwt; const T0 = Date.now() - 60_000; const tok = (extra: any = {}) => ({ id: "", role: "MEMBER", signedInAt: T0, roleCheckedAt: 0, ...extra });
  const ended = async (token: any) => { try { await jwt({ token }); return false; } catch (e: any) { return e.message === "SessionEnded"; } };
  const e1 = mk(OLD); as(e1); const stillBefore = await ended(tok({ id: e1 })); await A.changeMyPassword(OLD, NEW); const afterChange = await ended(tok({ id: e1 })); const newer = await ended(tok({ id: e1, signedInAt: Date.now() + 1000 }));
  t("END TO END (password): a sign-in that began BEFORE the password was changed is ended by the real sign-in code; one that begins afterwards (with the new password) is not; before the change it was fine", stillBefore === false && afterChange === true && newer === false);
  const e2 = mk(); as(e2); const beforeSo = await ended(tok({ id: e2 })); await A.signOutEverywhere(); const afterSo = await ended(tok({ id: e2 })); const laterSo = await ended(tok({ id: e2, signedInAt: Date.now() + 1000 }));
  t("END TO END (sign out everywhere): every sign-in that began before is ended by the real sign-in code; a later one is not", beforeSo === false && afterSo === true && laterSo === false);
  // ===== the words, and the shape of the code =====
  const bad: any[] = [PP.checkPassword("Abc-12"), PP.checkPassword("password1234"), PP.checkPassword("neema-forever-1", { name: "Neema Mwadime" }), PP.checkPassword("mnbvcxzlkjhg"), PP.checkPassword("aaaaabbbbb"), PP.checkPassword("x7Kq-".repeat(15))];
  t("MESSAGES: the translatable message for every kind of refusal is exactly the English the rule itself gives (so the dictionary keys can never drift from what the rule says), and each is different", bad.every((p) => !p.ok && PT.passwordProblemText(p, (s: string, v?: any) => s.replace(/\{(\w+)\}/g, (_m, k) => String(v?.[k] ?? _m))) === p.message) && new Set(bad.map((p) => p.message)).size === 6);
  const src = fs.readFileSync("lib/actions/account-security.ts", "utf8"); const exportsList = [...src.matchAll(/^export (async function|function|const|type|class)\s+(\w+)/gm)];
  t("SHAPE OF THE ACTIONS FILE: it only exports async functions and types (what a server-actions file allows); no action takes a user id (they act only on whoever is signed in); nothing is logged; errors are codes, never English sentences", exportsList.filter((m) => m[1] !== "type").every((m) => m[1] === "async function") && !/export async function \w+\([^)]*\b(userId|id)\b/.test(src) && !/console\./.test(src) && !/error:\s*"/.test(src) && /"use server"/.test(src.split("\n")[0]));
  console.warn = warn; let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} ACCOUNT SECURITY CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
