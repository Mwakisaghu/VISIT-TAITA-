const Module = require("module"); const origLoad = Module._load;
let blockers: string[] = [];
Module._load = function (r: string, ...x: any[]) { if (r === "@/lib/account-data") return { getDeletionBlockers: async () => blockers }; return origLoad.call(this, r, ...x); };
// ----- a small in-memory database: rows carry their relations as nested objects, so one matcher serves every query -----
const T: Record<string, any[]> = {}; const calls: { model: string; method: string; where: any }[] = [];
const match = (row: any, where: any): boolean => !where || Object.entries(where).every(([k, v]: [string, any]) => {
  if (v && typeof v === "object" && !(v instanceof Date)) { if ("in" in v) return v.in.includes(row?.[k]); return row?.[k] != null && match(row[k], v); }
  return row?.[k] === v;
});
const table = (m: string) => (T[m] ??= []);
const handler = (model: string) => ({
  findMany: async (a: any = {}) => { calls.push({ model, method: "findMany", where: a.where }); let rows = table(model).filter((r) => match(r, a.where)); if (a.take) rows = rows.slice(0, a.take); return rows; },
  findUnique: async (a: any) => { calls.push({ model, method: "findUnique", where: a.where }); return table(model).find((r) => match(r, a.where)) ?? null; },
  count: async (a: any = {}) => { calls.push({ model, method: "count", where: a.where }); return table(model).filter((r) => match(r, a.where)).length; },
  aggregate: async (a: any = {}) => { calls.push({ model, method: "aggregate", where: a.where }); const rows = table(model).filter((r) => match(r, a.where)); return { _sum: { amount: rows.reduce((n, r) => n + r.amount, 0) || null }, _count: rows.length }; },
});
(globalThis as any).prisma = new Proxy({}, { get: (_t, model: string) => handler(model) });
const H = 3600000; const NOW = new Date("2026-10-15T10:00:00Z"); const at = (h: number) => new Date(NOW.getTime() + h * H);
async function main() {
  const { loadAccountHub } = await import("@/lib/account-hub");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const dest = (id: string, name: string, altitudeM: number | null, status = "PUBLISHED") => ({ id, slug: id, name, altitudeM, status });
  const D = { voi: dest("voi", "Voi", 580), jipe: dest("jipe", "Lake Jipe", 700), mwa: dest("mwa", "Mwatate", 1050), wun: dest("wun", "Wundanyi", 1250), mbo: dest("mbo", "Mbololo Forest", 1500), wes: dest("wes", "Wesu", 1650), nga: dest("nga", "Ngangao Forest", 1800), kas: dest("kas", "Kasigau", 1000), secret: dest("secret", "Unpublished place", 800, "DRAFT") };
  const U = { id: "u1", name: "Neema Mwadime", email: "neema@x.co", role: "MEMBER", createdAt: new Date("2026-09-03T08:00:00Z"), emailVerifiedAt: new Date("2026-09-03T08:05:00Z"), termsAcceptedAt: new Date("2026-09-03T08:00:00Z"), termsVersion: "2026-10.2", points: 120, payoutPhone: null };
  const OTHER = { ...U, id: "u2", name: "Someone Else", email: "else@x.co" };
  const seed = () => {
    for (const k of Object.keys(T)) delete T[k]; calls.length = 0; blockers = [];
    T.user = [U, OTHER]; T.visit = [...["voi", "jipe", "mwa", "wun", "mbo", "wes", "nga"].map((k) => ({ userId: "u1", destination: (D as any)[k] })), { userId: "u2", destination: D.kas }];
    T.placeWish = [{ userId: "u1", destination: D.nga }, { userId: "u1", destination: D.kas }, { userId: "u1", destination: D.mbo }, { userId: "u1", destination: D.secret }, { userId: "u2", destination: D.voi }];
    T.booking = [{ id: "b1", userId: "u1", status: "CONFIRMED", guests: 2, session: { startsAt: at(48) }, experience: { name: "Ngangao Forest guided walk", ownerId: "host1" } }, { id: "b2", userId: "u1", status: "COMPLETED", guests: 1, session: { startsAt: at(-500) }, experience: { name: "Old walk", ownerId: "host1" } }, { id: "b3", userId: "u1", status: "CANCELLED", guests: 1, session: { startsAt: at(100) }, experience: { name: "Cancelled", ownerId: "host1" } }, { id: "b9", userId: "u2", status: "CONFIRMED", guests: 4, session: { startsAt: at(20) }, experience: { name: "Someone else's", ownerId: "host1" } }];
    const ev = { id: "e1", name: "Taita Week, opening night", eventDate: at(200) }, past = { id: "e0", name: "Past event", eventDate: at(-300) };
    T.ticket = [{ userId: "u1", groupId: "g1", status: "VALID", event: ev }, { userId: "u1", groupId: "g1", status: "VALID", event: ev }, { userId: "u1", groupId: "g0", status: "USED", event: past }, { userId: "u2", groupId: "gx", status: "VALID", event: ev }];
    T.order = [{ id: "o1", buyerId: "u1", orderNumber: "TT-1042", status: "CONFIRMED", paymentStatus: "PAID", totalAmount: 3800, items: [{ quantity: 1, product: { name: "Sisal basket" } }, { quantity: 1, product: { name: "Kiondo" } }] }, { id: "o0", buyerId: "u1", orderNumber: "TT-0900", status: "FULFILLED", paymentStatus: "PAID", totalAmount: 900, items: [{ quantity: 1, product: { name: "Mug" } }] }, { id: "ox", buyerId: "u2", orderNumber: "TT-5", status: "PENDING", paymentStatus: "UNPAID", totalAmount: 1, items: [] }];
    T.dayPlan = [{ userId: "u1" }, { userId: "u1" }, { userId: "u2" }];
    T.experienceEnquiry = [{ userId: "u1", status: "NEW", experience: { ownerId: "host1" } }, { userId: "u2", status: "NEW", experience: { ownerId: "host1" } }];
    T.accommodationEnquiry = [{ userId: "u1", status: "CONTACTED", accommodation: { ownerId: "host1" } }];
    T.review = [{ userId: "u1", status: "APPROVED" }, { userId: "u1", status: "PENDING" }, { userId: "u2", status: "APPROVED" }];
    T.fieldNote = [{ creator: { userId: "u2" } }];
    T.reward = [{ status: "PUBLISHED", stock: null, validUntil: null, pointsCost: 100 }, { status: "PUBLISHED", stock: 0, validUntil: null, pointsCost: 10 }, { status: "PUBLISHED", stock: null, validUntil: null, pointsCost: 500 }, { status: "DRAFT", stock: null, validUntil: null, pointsCost: 5 }];
    T.rewardRedemption = [{ userId: "u1", status: "ISSUED" }, { userId: "u1", status: "USED" }, { userId: "u2", status: "ISSUED" }];
    T.newsletterSubscriber = [{ email: "neema@x.co", status: "ACTIVE", confirmedAt: new Date("2026-09-12T08:00:00Z") }];
  };
  seed(); const hub: any = await loadAccountHub("u1", NOW);
  t("PERSON: the person's own details come back (name, email, role, joined, verified, terms, points)", hub.user.id === "u1" && hub.user.email === "neema@x.co" && hub.user.points === 120 && hub.user.emailVerifiedAt instanceof Date);
  t("STAMPS: only this person's 7 stamps (the other person's stamp is not counted); the ribbon names the lowest and highest", hub.ribbon.total === 7 && hub.ribbon.lowest.name === "Voi" && hub.ribbon.highest.name === "Ngangao Forest" && hub.ribbon.dots.length === 7);
  t("WANT TO GO: only published places that are this person's; 'next to stamp' skips a stamped place and is the newest left (Kasigau, saved after Ngangao and not stamped)", hub.wishes.map((w: any) => w.id).join() === "nga,kas,mbo" && hub.next.id === "kas" && hub.next.name === "Kasigau");
  t("BOOKINGS: one upcoming (the cancelled and the completed are not), two counted as past, and the other person's booking is nowhere", hub.bookings.upcoming === 1 && hub.bookings.past === 2);
  t("TICKETS: one upcoming group with 2 valid tickets; the used one for a past event and the other person's ticket are not counted", hub.tickets.upcoming === 1 && hub.tickets.valid === 2 && hub.tickets.total === 2);
  t("ORDERS: this person's two orders, one still open; the other person's order is not counted", hub.orders.total === 2 && hub.orders.open === 1);
  t("COUNTS: day plans 2, enquiries 2 with 1 waiting (NEW), reviews 2 with 1 pending, Field Notes 0 (the note in the data is someone else's), vouchers ready 1, rewards ready 1 (100 points buys the first; the empty shelf, the 500-point and the draft do not)", hub.plans === 2 && hub.enquiries.total === 2 && hub.enquiries.waiting === 1 && hub.reviews.total === 2 && hub.reviews.pending === 1 && hub.notes === 0 && hub.rewards.vouchers === 1 && hub.rewards.ready === 1);
  const ci = hub.comingUp;
  t("COMING UP: the next booking, the next tickets and the open order, each with what the card needs (name, time, guests or ticket count, order number, amount and a state)", ci.length === 3 && ci[0].kind === "booking" && ci[0].name === "Ngangao Forest guided walk" && ci[0].guests === 2 && ci[1].kind === "tickets" && ci[1].live === 2 && ci[1].name === "Taita Week, opening night" && ci[2].kind === "order" && ci[2].orderNumber === "TT-1042" && ci[2].state === "preparing" && ci[2].firstItem === "Sisal basket" && ci[2].otherItems === 1 && ci[2].totalAmount === 3800);
  t("NEWSLETTER and BLOCKERS: the subscription status comes through; the deletion blockers come from the existing deletion rules", hub.subscriber.status === "ACTIVE" && Array.isArray(hub.blockers) && hub.blockers.length === 0);
  const memberCalls = calls.length; const hostCalls = calls.filter((c) => /hostPayout/.test(c.model)).length;
  t("A MEMBER (not a host): no host band, no host statistics, and no host queries were run at all", hub.work.length === 0 && hub.host === null && hostCalls === 0);
  // ===== every query is scoped =====
  const ids = ["u1"]; const unscoped = calls.filter((c) => !(c.model === "reward" && c.method === "findMany" && JSON.stringify(c.where) === '{"status":"PUBLISHED"}') && !ids.some((i) => JSON.stringify(c.where ?? {}).includes(`"${i}"`)) && !(c.model === "newsletterSubscriber" && /neema@x\.co/.test(JSON.stringify(c.where))));
  t("SCOPED EVERYWHERE: every database query names this person (as their id, or their email for the newsletter) — the only one that does not is the public list of published rewards" + (unscoped.length ? " — UNSCOPED: " + unscoped.map((c) => c.model + "." + c.method).join(", ") : ""), unscoped.length === 0);
  t("NO RUNAWAY QUERIES: the member's page runs 17 or fewer queries, each list is capped, and nothing runs once per item", memberCalls <= 17 && calls.filter((c) => c.model === "booking" && c.method === "findMany").length === 1);
  // ===== a host =====
  seed(); T.user.push({ ...U, id: "host1", name: "Peter Mwakio", email: "peter@x.co", role: "PARTNER", payoutPhone: "0712345678" });
  T.experience = [{ ownerId: "host1", status: "PUBLISHED" }, { ownerId: "host1", status: "DRAFT" }, { ownerId: "u2", status: "PUBLISHED" }]; T.accommodation = [{ ownerId: "host1", status: "PUBLISHED" }];
  T.booking.push({ id: "r1", userId: "u2", status: "REQUESTED", guests: 2, session: { startsAt: at(30) }, experience: { name: "Walk", ownerId: "host1" } }, { id: "r2", userId: "u2", status: "REQUESTED", guests: 3, session: { startsAt: at(40) }, experience: { name: "Walk", ownerId: "host1" } }, { id: "r3", userId: "u2", status: "REQUESTED", guests: 1, session: { startsAt: at(40) }, experience: { name: "Not mine", ownerId: "u2" } }, { id: "r4", userId: "u2", status: "CONFIRMED", guests: 1, session: { startsAt: at(40) }, experience: { name: "Walk", ownerId: "host1" } });
  T.experienceEnquiry.push({ userId: "u2", status: "NEW", experience: { ownerId: "host1" } }); T.accommodationEnquiry.push({ userId: "u2", status: "NEW", accommodation: { ownerId: "host1" } }, { userId: "u2", status: "CONTACTED", accommodation: { ownerId: "host1" } });
  T.hostPayout = [{ hostId: "host1", status: "PENDING", amount: 18400 }, { hostId: "host1", status: "PAID", amount: 99999 }, { hostId: "u2", status: "PENDING", amount: 5 }];
  const hh: any = await loadAccountHub("host1", NOW);
  t("A HOST: the host band is on; the statistics are the host's own: 2 booking requests waiting (not the confirmed one, not another host's), 4 new enquiries (3 for their experiences and 1 for their stay; only NEW ones, only for their own listings), 2 live listings (the draft and another host's are not), and the pending payout KSh 18,400 (not the paid one, not another host's)", hh.work.join() === "host" && hh.host.pendingRequests === 2 && hh.host.newEnquiries === 4 && hh.host.liveListings === 2 && hh.host.payoutPending.amount === 18400 && hh.host.payoutPending.count === 1);
  seed(); T.user.push({ ...U, id: "host1", role: "PARTNER", email: "p@x.co" }); T.hostPayout = [{ hostId: "host1", status: "PAID", amount: 100 }]; const nopay: any = await loadAccountHub("host1", NOW);
  t("A HOST with nothing owed: no pending payout is shown (null), not a zero", nopay.host.payoutPending === null && nopay.host.pendingRequests === 0);
  seed(); T.experience = [{ ownerId: "u1", status: "PUBLISHED" }]; const owner: any = await loadAccountHub("u1", NOW);
  t("AN OWNER WHATEVER THEIR ROLE: an ordinary member who owns a listing still gets the host band", owner.work.join() === "host" && owner.host.liveListings === 1);
  seed(); T.user.push({ ...U, id: "adm", role: "ADMIN", email: "a@x.co" }); const adm: any = await loadAccountHub("adm", NOW);
  t("STAFF: an admin gets the admin band (and no host statistics unless they own listings)", adm.work.join() === "admin" && adm.host === null);
  seed(); const gone = await loadAccountHub("nobody", NOW);
  t("A DELETED ACCOUNT: the loader returns null (and the page says so) rather than failing", gone === null);
  seed(); T.visit = []; T.placeWish = []; T.booking = []; T.ticket = []; T.order = []; T.dayPlan = []; T.experienceEnquiry = []; T.accommodationEnquiry = []; T.review = []; T.reward = []; T.rewardRedemption = []; T.newsletterSubscriber = []; const empty: any = await loadAccountHub("u1", NOW);
  t("A BRAND-NEW MEMBER: everything is empty and nothing fails: no stamps, no wishes, nothing coming up, zero counts, no subscription", empty.ribbon.total === 0 && empty.ribbon.lowest === null && empty.next === null && empty.comingUp.length === 0 && empty.bookings.upcoming === 0 && empty.orders.total === 0 && empty.plans === 0 && empty.subscriber === null && empty.rewards.ready === 0);
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} ACCOUNT HUB DATA CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
