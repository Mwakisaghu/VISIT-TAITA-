const Module = require("module"); const origLoad = Module._load;
let session: any = { user: { id: "uA", role: "MEMBER" } }; const revalidated: string[] = []; const calls: { method: string; args: any }[] = [];
Module._load = function (r: string, ...x: any[]) {
  if (r === "next-auth") return { getServerSession: async () => session };
  if (r === "@/lib/auth") return { authOptions: {} };
  if (r === "next/cache") return { revalidatePath: (p: string) => revalidated.push(p) };
  return origLoad.call(this, r, ...x);
};
// a small in-memory database, so the scoping to one person's rows is really exercised
let wishes: { userId: string; destinationId: string; createdAt: number }[] = []; let visits: { userId: string; destinationId: string; method: string }[] = []; let dests: Record<string, { id: string; status: string }> = {}; let createError: any = null;
const db = {
  placeWish: {
    findUnique: async (a: any) => { calls.push({ method: "placeWish.findUnique", args: a }); const k = a.where.userId_destinationId; return wishes.find((w) => w.userId === k.userId && w.destinationId === k.destinationId) ? { id: "x" } : null; },
    count: async (a: any) => { calls.push({ method: "placeWish.count", args: a }); return wishes.filter((w) => w.userId === a.where.userId).length; },
    create: async (a: any) => { calls.push({ method: "placeWish.create", args: a }); if (createError) throw createError; wishes.push({ ...a.data, createdAt: wishes.length }); return {}; },
    deleteMany: async (a: any) => { calls.push({ method: "placeWish.deleteMany", args: a }); wishes = wishes.filter((w) => !(w.userId === a.where.userId && w.destinationId === a.where.destinationId)); return { count: 1 }; },
    findMany: async (a: any) => { calls.push({ method: "placeWish.findMany", args: a }); return wishes.filter((w) => w.userId === a.where.userId).sort((p, q) => q.createdAt - p.createdAt).map((w) => ({ destinationId: w.destinationId })); },
  },
  destination: { findUnique: async (a: any) => { calls.push({ method: "destination.findUnique", args: a }); return dests[a.where.id] ?? null; } },
  visit: { findMany: async (a: any) => { calls.push({ method: "visit.findMany", args: a }); return visits.filter((v) => v.userId === a.where.userId).map((v) => ({ destinationId: v.destinationId, method: v.method })); } },
};
(globalThis as any).prisma = db;

async function main() {
  const S = await import("@/lib/stamps"); const A = await import("@/lib/actions/stamps"); const Api = await import("@/app/api/stamps/route");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const reset = () => { wishes = []; visits = []; dests = { d1: { id: "d1", status: "PUBLISHED" }, d2: { id: "d2", status: "PUBLISHED" }, draft: { id: "draft", status: "DRAFT" } }; createError = null; calls.length = 0; revalidated.length = 0; session = { user: { id: "uA", role: "MEMBER" } }; };
  // ===== rules =====
  t("BEEN: QR and GPS check-ins are 'verified'; a self-report is 'self'; anything else (or nothing) is 'none'", S.beenOf("QR") === "verified" && S.beenOf("LOCATION") === "verified" && S.beenOf("SELF_REPORTED") === "self" && S.beenOf("TELEPATHY") === "none" && S.beenOf(null) === "none" && S.beenOf(undefined) === "none");
  const st: any = { signedIn: true, visited: { a: "verified", b: "self" }, wanted: ["b", "c"] };
  t("STATE: a place's state combines what the person has checked in with what they want to visit", JSON.stringify(S.stateFor(st, "a")) === '{"been":"verified","want":false}' && JSON.stringify(S.stateFor(st, "b")) === '{"been":"self","want":true}' && JSON.stringify(S.stateFor(st, "c")) === '{"been":"none","want":true}' && JSON.stringify(S.stateFor(st, "zzz")) === '{"been":"none","want":false}');
  t(`WISH LIMIT: ${S.MAX_WISHES} places at most; adding is refused at the cap with a plain message; taking one off is ALWAYS allowed, even at the cap`, S.MAX_WISHES === 100 && S.wishDecision(false, 99).action === "add" && S.wishDecision(false, 100).action === "refuse" && /full/.test(S.wishDecision(false, 100).reason!) && S.wishDecision(true, 100).action === "remove" && S.wishDecision(true, 0).action === "remove");
  const a1 = S.applyWish(st, "z"), a2 = S.applyWish(a1, "z"); t("OPTIMISTIC WISH: toggling twice returns to the start; the original object is never changed", a1.wanted.includes("z") && !a2.wanted.includes("z") && JSON.stringify(a2) === JSON.stringify(st) && st.wanted.length === 2);
  const b1 = S.applyBeen(st, "n"), b2 = S.applyBeen(b1, "n"); t("OPTIMISTIC BEEN: a self-report can be marked and un-marked; a verified check-in can NOT be changed here; the original is never changed", b1.visited.n === "self" && !("n" in b2.visited) && S.applyBeen(st, "a") === st && S.applyBeen(st, "a").visited.a === "verified" && S.applyBeen(st, "b").visited.b === undefined && st.visited.b === "self");
  const long = "x".repeat(65);
  t("SANITIZE: only a clean 'signedIn: true' answer counts; null, strings, arrays and 'signedIn: \"true\"' all mean signed out", [null, undefined, "str", 5, [], {}, { signedIn: "true" }, { signedIn: 1 }, { signedIn: false }].every((x: any) => S.sanitizeStamps(x).signedIn === false));
  t("SANITIZE (hostile data): wrong types, unknown values, empty and 65-character ids are dropped; 'verified' and 'self' are kept; ids are de-duplicated; sizes are capped", (() => { const s = S.sanitizeStamps({ signedIn: true, visited: { ok: "verified", ok2: "self", bad: "admin", [long]: "self", "": "self", n: 5 }, wanted: ["w1", "w1", 7, null, "", long, "w2", { x: 1 }] }); return s.signedIn && JSON.stringify(s.visited) === '{"ok":"verified","ok2":"self"}' && JSON.stringify(s.wanted) === '["w1","w2"]'; })() && S.sanitizeStamps({ signedIn: true, wanted: Array.from({ length: 5000 }, (_, i) => "w" + i), visited: Object.fromEntries(Array.from({ length: 5000 }, (_, i) => ["v" + i, "self"])) }).wanted.length === 2000 && Object.keys(S.sanitizeStamps({ signedIn: true, visited: Object.fromEntries(Array.from({ length: 5000 }, (_, i) => ["v" + i, "self"])) }).visited).length === 2000);
  t("COUNTS: proper grammar for one and many, either part on its own, nothing at zero, and odd numbers are tamed", S.countLabel(12, 30) === "12 people want to go · 30 people have been here" && S.countLabel(1, 1) === "1 person wants to go · 1 person has been here" && S.countLabel(0, 4) === "4 people have been here" && S.countLabel(3, 0) === "3 people want to go" && S.countLabel(0, 0) === null && S.countLabel(-5, NaN) === null && S.countLabel(2.9, 0) === "2 people want to go");
  // ===== flip, save, undo =====
  const base: any = { signedIn: true, visited: {}, wanted: [] };
  let o = await S.settle(base, (s: any) => S.applyWish(s, "p"), async () => ({ ok: true })); t("SETTLE (saved): the optimistic result stays and there is no message", o.stamps.wanted.join() === "p" && o.error === null);
  o = await S.settle(base, (s: any) => S.applyWish(s, "p"), async () => undefined); t("SETTLE (an action that returns nothing, like the visit toggle, counts as saved)", o.stamps.wanted.join() === "p" && o.error === null);
  o = await S.settle(base, (s: any) => S.applyWish(s, "p"), async () => ({ ok: false, error: "Your list is full (100 places). Take one off to add another." })); t("SETTLE (the server says no): the old state comes back and the server's own message is shown", o.stamps === base && o.stamps.wanted.length === 0 && /list is full/.test(o.error!));
  o = await S.settle(base, (s: any) => S.applyWish(s, "p"), async () => ({ ok: false })); t("SETTLE (refused without a reason): still undone, with a generic plain message", o.stamps === base && /Couldn't save that/.test(o.error!));
  o = await S.settle(base, (s: any) => S.applyBeen(s, "p"), async () => { throw new Error("Failed to fetch"); }); t("SETTLE (the connection drops): the old state comes back with a message about the connection — the screen never claims something that was not saved", o.stamps === base && /check your connection/.test(o.error!) && !("p" in o.stamps.visited));
  const withBeen: any = { signedIn: true, visited: { p: "self" }, wanted: [] }; o = await S.settle(withBeen, (s: any) => S.applyBeen(s, "p"), async () => { throw new Error("x"); }); t("SETTLE: undoing a self-reported visit that fails to save puts the stamp back", o.stamps === withBeen && o.stamps.visited.p === "self");
  // ===== the toggle action =====
  reset(); session = null; let r: any = await A.toggleWish("d1");
  t("TOGGLE (signed out): refused with a plain message; the database is not touched", r.ok === false && /sign in/.test(r.error) && calls.length === 0 && wishes.length === 0);
  reset(); r = await A.toggleWish("d1");
  t("TOGGLE (add): saved against the SIGNED-IN person (never an id from the request), reports wanted: true, and the Passport page is refreshed", r.ok === true && r.wanted === true && wishes.length === 1 && wishes[0].userId === "uA" && wishes[0].destinationId === "d1" && revalidated.includes("/passport"));
  r = await A.toggleWish("d1"); t("TOGGLE (again): taken off the list again, reports wanted: false", r.ok === true && r.wanted === false && wishes.length === 0);
  reset(); r = await A.toggleWish("nope"); const r2: any = await A.toggleWish("draft"); t("TOGGLE: a place that doesn't exist, or isn't published, can't be saved (the same message for both, so unpublished places aren't revealed)", r.ok === false && r2.ok === false && r.error === r2.error && wishes.length === 0);
  reset(); const odd: any[] = []; for (const v of ["", "   ", "x".repeat(65), 5, null, undefined, { a: 1 }]) odd.push(await A.toggleWish(v as any)); t("TOGGLE (odd input): empty, blank, over-long, non-text and missing ids are refused and never reach the database", odd.every((x) => x.ok === false) && calls.length === 0);
  reset(); for (let i = 0; i < 100; i++) wishes.push({ userId: "uA", destinationId: "old" + i, createdAt: i }); r = await A.toggleWish("d1"); const keep = wishes.length;
  t("TOGGLE (limit): at 100 saved places adding another is refused with the message and nothing is written; but one already saved can still be removed", r.ok === false && /full/.test(r.error) && keep === 100 && !calls.some((c) => c.method === "placeWish.create") && (await A.toggleWish("old3") as any).wanted === false && wishes.length === 99);
  reset(); createError = Object.assign(new Error("unique"), { code: "P2002" }); r = await A.toggleWish("d1"); t("TOGGLE (two taps at once): the second one hits the database's unique rule and still ends happily as 'saved' — no crash", r.ok === true && r.wanted === true);
  reset(); createError = Object.assign(new Error("db down"), { code: "P1001" }); let threw = false; try { await A.toggleWish("d1"); } catch { threw = true; } t("TOGGLE: any OTHER database error is not swallowed", threw);
  reset(); wishes.push({ userId: "uB", destinationId: "d1", createdAt: 1 }); await A.toggleWish("d1"); await A.toggleWish("d1");
  t("🔒 TOGGLE: it only ever touches the signed-in person's own list — another person's saved place is never added to, counted against, or removed", wishes.filter((w) => w.userId === "uB").length === 1 && calls.filter((c) => c.method === "placeWish.deleteMany").every((c) => c.args.where.userId === "uA") && calls.filter((c) => c.method === "placeWish.count").every((c) => c.args.where.userId === "uA"));
  // ===== the read route =====
  reset(); session = null; calls.length = 0; let resp = await Api.GET(); let body = await resp.json();
  t("API (signed out): 200 with just { signedIn: false }, never cached, and the database is not touched", resp.status === 200 && body.signedIn === false && Object.keys(body).length === 1 && /private/.test(resp.headers.get("cache-control")!) && /no-store/.test(resp.headers.get("cache-control")!) && calls.length === 0);
  reset(); visits = [{ userId: "uA", destinationId: "d1", method: "QR" }, { userId: "uA", destinationId: "d2", method: "SELF_REPORTED" }, { userId: "uA", destinationId: "d3", method: "LOCATION" }, { userId: "uA", destinationId: "d4", method: "MYSTERY" }, { userId: "uB", destinationId: "d9", method: "QR" }]; wishes = [{ userId: "uA", destinationId: "w1", createdAt: 1 }, { userId: "uA", destinationId: "w2", createdAt: 2 }, { userId: "uB", destinationId: "wB", createdAt: 3 }];
  resp = await Api.GET(); body = await resp.json();
  t("API (signed in): visited places with verified or self (QR and GPS are 'verified', an unknown method is left out), wanted places newest first", resp.status === 200 && body.signedIn === true && JSON.stringify(body.visited) === '{"d1":"verified","d2":"self","d3":"verified"}' && JSON.stringify(body.wanted) === '["w2","w1"]');
  t("🔒 API: only the signed-in person's own rows are read and returned — another person's visits and wishes never appear", !JSON.stringify(body).includes("d9") && !JSON.stringify(body).includes("wB") && calls.filter((c) => c.method === "visit.findMany" || c.method === "placeWish.findMany").every((c) => c.args.where.userId === "uA") && calls.filter((c) => /findMany/.test(c.method)).length === 2);
  t("API: the answer round-trips through the client's defensive reader unchanged", JSON.stringify(S.sanitizeStamps(body)) === JSON.stringify({ signedIn: true, visited: body.visited, wanted: body.wanted }));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} STAMPS CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
