const Module = require("module"); const origLoad = Module._load; const emails: string[] = [];
Module._load = function (r: string, ...x: any[]) {
  if (r === "@/lib/account-verification") return { sendVerificationEmail: async (id: string) => { if ((globalThis as any).MAIL_FAILS) throw new Error("mail down"); emails.push(id); } };
  return origLoad.call(this, r, ...x);
};
const users: any[] = []; let hashes = 0; const lookups: string[] = [];
(globalThis as any).prisma = { user: { findUnique: async ({ where }: any) => { lookups.push(where.email); return users.find((u) => u.email === where.email) ?? null; }, create: async ({ data }: any) => { const u = { id: `u${users.length + 1}`, ...data }; users.push(u); return u; } } };
const realNow = Date.now; let offset = 0; Date.now = () => realNow() + offset;
async function main() {
  const { POST } = await import("@/app/api/auth/register/route");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, ok]);
  let seq = 0; const body = (o: any = {}) => ({ name: "Jane Wanjiru", email: `jane${++seq}@mail.com`, password: "a-good-password", acceptTerms: true, ...o });
  const post = async (ip: string | null, b: any = body(), raw?: string) => POST(new Request("https://x/api/auth/register", { method: "POST", headers: ip ? { "x-forwarded-for": ip, "content-type": "application/json" } : { "content-type": "application/json" }, body: raw ?? JSON.stringify(b) })) as any;

  // ----- behaviour that must not change -----
  let r = await post("10.0.0.1"); let j = await r.json();
  t("SIGN-UP still works: 200 with the new account's id and email; the account is MEMBER, has accepted-terms details and a hashed (not plain) password", r.status === 200 && j.id === "u1" && j.email === "jane1@mail.com" && users[0].role === "MEMBER" && users[0].termsAcceptedAt instanceof Date && users[0].passwordHash && users[0].passwordHash !== "a-good-password" && /^\$2[aby]\$/.test(users[0].passwordHash));
  t("…and a verification email is requested for it", emails.length === 1 && emails[0] === "u1");
  r = await post("10.0.0.2", body({ email: "MixedCase@Mail.COM" })); t("the email is stored lower-case", users.at(-1).email === "mixedcase@mail.com");
  (globalThis as any).MAIL_FAILS = true; const q0 = console.error; console.error = () => {}; r = await post("10.0.0.3"); console.error = q0; (globalThis as any).MAIL_FAILS = false; t("if the verification email can't be sent, sign-up STILL succeeds", r.status === 200);
  r = await post("10.0.0.4", body({ acceptTerms: false })); t("not accepting the Terms is refused (400, the Terms message)", r.status === 400 && /Terms of Use/.test((await r.json()).error));
  r = await post("10.0.0.5", body({ password: "short" })); t("a short password is refused (400)", r.status === 400);
  r = await post("10.0.0.6", undefined, "not json"); t("a body that isn't JSON is refused (400), not a crash", r.status === 400);
  r = await post("10.0.0.7", body({ email: "jane1@mail.com" })); t("an email that already has an account is refused (409)", r.status === 409);

  // ----- the new limit -----
  const A = "203.0.113.50"; const before = { users: users.length, emails: emails.length, lookups: lookups.length }; const codes: number[] = [];
  for (let i = 0; i < 17; i++) codes.push((await post(A)).status);
  t("THE LIMIT: from one connection the first 15 attempts are processed and the 16th and 17th are refused with 429", codes.slice(0, 15).every((c) => c === 200) && codes[15] === 429 && codes[16] === 429);
  r = await post(A); j = await r.json(); t("the refusal says why and when to try again, and is a JSON error like the others", r.status === 429 && /Too many sign-up attempts/.test(j.error) && /hour/.test(j.error));
  t("a REFUSED attempt does no work: no database lookup, no password hash, no account, no email (that is the whole point)", users.length - before.users === 15 && emails.length - before.emails === 15 && lookups.length - before.lookups === 15);
  r = await post("203.0.113.51"); t("a DIFFERENT connection is not affected", r.status === 200);
  const B = "203.0.113.60"; for (let i = 0; i < 15; i++) await post(B, body({ acceptTerms: false })); r = await post(B); t("INVALID attempts count towards the limit too (so it can't be probed for free), and so do 'already registered' ones", r.status === 429);
  const C = "203.0.113.70"; for (let i = 0; i < 15; i++) await post(C, body({ email: "jane1@mail.com" })); r = await post(C); t("…the 'already registered' 409s as well", r.status === 429);
  offset += 59 * 60 * 1000; r = await post(A); t("59 minutes later the limit still holds", r.status === 429);
  offset += 2 * 60 * 1000; r = await post(A); t("a little over an hour later the connection may sign up again (the window resets)", r.status === 200);
  const parts = "198.51.100.9, 10.0.0.1, 10.0.0.2"; for (let i = 0; i < 15; i++) await post(parts); t("with a proxy chain the FIRST address is the connection that counts; a different first address is a different bucket", (await post(parts)).status === 429 && (await post("198.51.100.10, 10.0.0.1")).status === 200);
  for (let i = 0; i < 15; i++) await post(null); t("requests with no address information share one 'unknown' bucket (documented limit: if the host doesn't pass the address, this is a global cap instead of per-connection)", (await post(null)).status === 429);

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} SIGN-UP CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
