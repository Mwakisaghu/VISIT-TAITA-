const Module = require("module"); const origLoad = Module._load; let session: any = null; const sent: any[] = []; let mailFails = false;
Module._load = function (r: string, ...x: any[]) {
  if (r === "next-auth") return { getServerSession: async () => session };
  if (r === "next/cache") return { revalidatePath() {} };
  if (r === "@/lib/email") return { emailConfigured: () => true, sendEmail: async (m: any) => { if (mailFails) throw new Error("mail down"); sent.push(m); } };
  return origLoad.call(this, r, ...x);
};
const FK = require("./payout_fake"); const { T, makeDb, resetDb, addUser, hooks, nid } = FK; const db = makeDb(); (globalThis as any).prisma = db;
process.env.NEXTAUTH_SECRET = "x".repeat(32);
const D = 86400000; const NOW = new Date(); const at = (d: number) => new Date(NOW.getTime() + d * D); const row = (t: string, id: string) => T[t].find((r: any) => r.id === id);
const as = (u: any) => { session = u ? { user: { id: u.id, role: u.role } } : null; };

async function main() {
  const O = await import("@/lib/payout-ops"); const A = await import("@/lib/actions/payouts"); const P = await import("@/lib/payout");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  let W: any;
  // a world: three hosts (good number / none / invalid), their experiences, and an experience Visit Taita runs itself
  const world = () => { resetDb(); sent.length = 0; mailFails = false; session = null;
    const h1 = addUser({ name: "Hosea Mwamburi", email: "hosea@host.co", role: "PARTNER", payoutPhone: "254712345678" }), h2 = addUser({ name: "No Number", email: "nonumber@host.co", role: "PARTNER" }), h3 = addUser({ name: "Bad Number", email: "bad@host.co", role: "PARTNER", payoutPhone: "0612345678" });
    const admin = addUser({ name: "Amina Admin", email: "amina@vt.co", role: "ADMIN" }), sup = addUser({ name: "Harry", email: "harry@vt.co", role: "SUPER_ADMIN" }), editor = addUser({ name: "Ed", email: "ed@vt.co", role: "EDITOR" }), member = addUser({ name: "Mem", email: "mem@x.co", role: "MEMBER" }), seller = addUser({ name: "Sel", email: "sel@x.co", role: "SELLER" });
    const e1 = { id: nid("ex"), name: "Sagalla Sunrise Hike", ownerId: h1.id }, e2 = { id: nid("ex"), name: "Beta Trail", ownerId: h2.id }, e3 = { id: nid("ex"), name: "Bad Number Safari", ownerId: h3.id }, e0 = { id: nid("ex"), name: "Visit Taita's own tour", ownerId: null };
    T.experience.push(e1, e2, e3, e0);
    W = { h1, h2, h3, admin, sup, editor, member, seller, e1, e2, e3, e0 };
    return W; };
  const bk = async (exp: any, o: any = {}) => { const s = { id: nid("se"), experienceId: exp.id, startsAt: o.startsAt ?? at(-10) }; T.experienceSession.push(s); const b = await db.booking.create({ data: { reference: `VT-${nid("R")}`, status: "COMPLETED", experienceId: exp.id, sessionId: s.id, paidAmount: 6000, refundedAmount: 0, completedAt: o.startsAt ?? at(-10), ...o, startsAt: undefined } }); return b; };
  const mine = (id: string) => row("booking", id);

  // ===== settings =====
  world(); let st = await O.getSettings(db); t("SETTINGS: with nothing saved, the defaults apply (10%, held 2 days)", st.commissionPercent === 10 && st.holdDays === 2);
  await O.saveSettings(db, { commissionPercent: 15, holdDays: 5 }, W.admin.id); st = await O.getSettings(db); t("SETTINGS: saved values are read back; saving twice updates the one row (never a second)", st.commissionPercent === 15 && st.holdDays === 5 && (await O.saveSettings(db, { commissionPercent: 12, holdDays: 3 }, W.admin.id), T.payoutSettings.length === 1 && (await O.getSettings(db)).commissionPercent === 12) && T.payoutSettings[0].updatedById === W.admin.id);

  // ===== the earnings picture =====
  world(); const done = await bk(W.e1), noshow = await bk(W.e1, { status: "NO_SHOW", paidAmount: 4000 }), kept = await bk(W.e1, { status: "CANCELLED", paidAmount: 6000, refundedAmount: 3000, completedAt: null, cancelledAt: at(-12) });
  const hold = await bk(W.e1, { startsAt: at(-1), completedAt: at(-1) }), upcoming = await bk(W.e1, { status: "CONFIRMED", startsAt: at(5), completedAt: null }), refundedAll = await bk(W.e1, { status: "CANCELLED", paidAmount: 6000, refundedAmount: 6000, completedAt: null }), unpaid = await bk(W.e1, { status: "AWAITING_PAYMENT", paidAmount: 0, completedAt: null }), own = await bk(W.e0), expired = await bk(W.e1, { status: "EXPIRED", paidAmount: 0, completedAt: null });
  const er = await O.loadEarnings(db, { now: NOW, holdDays: 2 }); const byId = Object.fromEntries(er.map((r: any) => [r.id, r.state]));
  t("EARNINGS: completed, no-show and 'cancelled with money kept' are payable; one inside the hold is waiting; a paid future booking is upcoming", byId[done.id] === "payable" && byId[noshow.id] === "payable" && byId[kept.id] === "payable" && byId[hold.id] === "waiting" && byId[upcoming.id] === "upcoming");
  t("EARNINGS: unpaid and expired bookings aren't listed at all; a fully-refunded one is listed as 'nothing owed'; a host-less experience's booking never appears (no payout for Visit Taita's own tours)", !(unpaid.id in byId) && !(expired.id in byId) && byId[refundedAll.id] === "nothing" && !(own.id in byId));
  const mineOnly = await O.loadEarnings(db, { hostId: W.h2.id, now: NOW, holdDays: 2 }); t("EARNINGS for one host contains only that host's bookings", mineOnly.length === 0 && (await O.loadEarnings(db, { hostId: W.h1.id, now: NOW, holdDays: 2 })).every((r: any) => r.hostId === W.h1.id));

  // ===== preparing payouts =====
  const r = await O.createPayouts(db, { now: NOW, actorId: W.admin.id }); const p = r.created[0]; const prow = row("hostPayout", p.id);
  t("PREPARE: one payout for the host with a number, covering the three payable bookings", r.created.length === 1 && p.hostId === W.h1.id && p.bookingCount === 3 && prow.status === "PENDING" && prow.createdById === W.admin.id);
  t("PREPARE: the money is right — kept 6,000 + 4,000 + 3,000 = 13,000; commission 10% booking by booking = 600 + 400 + 300 = 1,300; host sent 11,700 — and the rate used is written on the payout", prow.grossAmount === 13000 && prow.commissionAmount === 1300 && prow.amount === 11700 && prow.commissionPercent === 10 && prow.grossAmount - prow.commissionAmount === prow.amount);
  t("PREPARE: the number is stored normalised (2547…) as the destination, and exactly those three bookings are attached", prow.destination === "254712345678" && [done, noshow, kept].every((b) => mine(b.id).payoutId === p.id) && [hold, upcoming, refundedAll, unpaid, expired, own].every((b) => mine(b.id).payoutId === null));
  t("PREPARE: hosts it can't pay are SKIPPED AND NAMED with the reason, not silently dropped — and nothing is attached for them", true);
  // ... for that, give the other hosts payable bookings
  const b2 = await bk(W.e2), b3 = await bk(W.e3); const r2 = await O.createPayouts(db, { now: NOW, actorId: W.admin.id });
  t("PREPARE: a host with NO payout number is skipped and named ('they haven't registered a payout number'); one with an invalid number is skipped and named; neither booking is attached", r2.created.length === 0 && r2.skipped.length === 2 && r2.skipped.some((s: any) => s.hostName === "No Number" && /haven't registered a payout number/.test(s.reason)) && r2.skipped.some((s: any) => s.hostName === "Bad Number" && /isn't a valid Safaricom number/.test(s.reason)) && mine(b2.id).payoutId === null && mine(b3.id).payoutId === null);
  W.h2.payoutPhone = "0722 111 222"; const r3 = await O.createPayouts(db, { now: NOW, actorId: W.admin.id, hostId: W.h2.id }); t("PREPARE for ONE host only prepares that host (the invalid-number host is untouched), and the number is normalised", r3.created.length === 1 && r3.created[0].hostId === W.h2.id && row("hostPayout", r3.created[0].id).destination === "254722111222" && mine(b3.id).payoutId === null);
  const r4 = await O.createPayouts(db, { now: NOW, actorId: W.admin.id }); t("PREPARE again straight away: nothing new is payable, so nothing is created (no double payment)", r4.created.length === 0 && T.hostPayout.length === 2);

  // ===== rate and rounding =====
  world(); await O.saveSettings(db, { commissionPercent: 0, holdDays: 2 }, W.admin.id); const z = await bk(W.e1, { paidAmount: 2555 }); let rr = await O.createPayouts(db, { now: NOW, actorId: W.admin.id }); t("RATE 0%: the host receives everything kept (2,555)", row("hostPayout", rr.created[0].id).amount === 2555 && row("hostPayout", rr.created[0].id).commissionAmount === 0);
  world(); const z2 = await bk(W.e1, { paidAmount: 2555 }); rr = await O.createPayouts(db, { now: NOW, actorId: W.admin.id }); t("ROUNDING at the default 10%: 2,555 -> commission 256 (rounded), host 2,299; together exactly 2,555", row("hostPayout", rr.created[0].id).commissionAmount === 256 && row("hostPayout", rr.created[0].id).amount === 2299);
  const later = await bk(W.e1, { paidAmount: 5000 }); await O.saveSettings(db, { commissionPercent: 20, holdDays: 2 }, W.admin.id); const rr2 = await O.createPayouts(db, { now: NOW, actorId: W.admin.id });
  t("A CHANGED RATE applies only to payouts prepared AFTER the change: the earlier payout keeps its 10%, the new one uses 20% (5,000 -> 1,000 / 4,000)", row("hostPayout", rr.created[0].id).commissionPercent === 10 && row("hostPayout", rr.created[0].id).amount === 2299 && row("hostPayout", rr2.created[0].id).commissionPercent === 20 && row("hostPayout", rr2.created[0].id).amount === 4000);
  world(); await O.saveSettings(db, { commissionPercent: 50, holdDays: 0 }, W.admin.id); const one = await bk(W.e1, { paidAmount: 1, startsAt: at(-0.01), completedAt: at(-0.01) }); rr = await O.createPayouts(db, { now: NOW, actorId: W.admin.id }); t("EDGE: a booking worth 1 shilling at 50% would leave the host nothing — no empty payout is created and the booking is left free", rr.created.length === 0 && mine(one.id).payoutId === null && T.hostPayout.length === 0);
  world(); await O.saveSettings(db, { commissionPercent: 10, holdDays: 3 }, W.admin.id); const hb = await bk(W.e1, { startsAt: at(-2.9), completedAt: at(-2.9) }); rr = await O.createPayouts(db, { now: NOW, actorId: W.admin.id }); t("HOLD: earnings 2.9 days old with a 3-day hold are NOT prepared yet", rr.created.length === 0); rr = await O.createPayouts(db, { now: at(0.2), actorId: W.admin.id }); t("HOLD: …and are prepared once the hold has passed", rr.created.length === 1);

  // ===== the races =====
  world(); const bs = await Promise.all(Array.from({ length: 6 }, (_, i) => bk(W.e1, { paidAmount: 1000 * (i + 1) }))); const expectedGross = 21000;
  const raced = await Promise.all(Array.from({ length: 6 }, () => O.createPayouts(db, { now: NOW, actorId: W.admin.id })));
  const made = raced.flatMap((x: any) => x.created); const attached = T.booking.filter((b: any) => b.payoutId); const perPayout = T.hostPayout.map((p: any) => ({ p, n: attached.filter((b: any) => b.payoutId === p.id).length }));
  t("🔒 RACE (double-click / two admins): six 'prepare payouts' at the same instant -> every booking is in exactly ONE payout, the payouts add up to exactly what is owed (21,000 kept; 2,100 commission; 18,900 to the host), and no payout is empty", attached.length === 6 && T.hostPayout.reduce((n: number, p: any) => n + p.grossAmount, 0) === expectedGross && T.hostPayout.reduce((n: number, p: any) => n + p.amount, 0) === 18900 && T.hostPayout.reduce((n: number, p: any) => n + p.commissionAmount, 0) === 2100 && perPayout.every((x: any) => x.n === x.p.bookingCount && x.n > 0) && made.length === T.hostPayout.length);

  // ----- staggered races: a second click lands while the first is part-way through, at EVERY possible moment -----
  { const tick1 = () => new Promise((r) => setImmediate(r)); let bad = 0; const detail: string[] = [];
    for (let k = 0; k <= 24; k++) for (const k2 of [0, 3, 9]) {
      world(); for (let i = 0; i < 6; i++) await bk(W.e1, { paidAmount: 1000 * (i + 1) });
      const first = O.createPayouts(db, { now: NOW, actorId: W.admin.id }); for (let i = 0; i < k; i++) await tick1();
      const second = O.createPayouts(db, { now: NOW, actorId: W.sup.id }); for (let i = 0; i < k2; i++) await tick1();
      const third = O.createPayouts(db, { now: NOW, actorId: W.admin.id }); await Promise.all([first, second, third]);
      const attached = T.booking.filter((b: any) => b.payoutId);
      const fine = attached.length === 6 && T.hostPayout.length >= 1 && T.hostPayout.every((p: any) => { const mine2 = attached.filter((b: any) => b.payoutId === p.id); const tt = P.totalsFor(mine2, p.commissionPercent); return mine2.length > 0 && mine2.length === p.bookingCount && tt.gross === p.grossAmount && tt.net === p.amount; }) && T.hostPayout.reduce((n: number, p: any) => n + p.amount, 0) === 18900;
      if (!fine) { bad++; if (detail.length < 2) detail.push(`k=${k}/${k2}`); }
    }
    t(`🔒 STAGGERED RACES: a second and third 'prepare payouts' starting at 75 different moments while the first is part-way through — in EVERY case each booking sits in exactly one payout, every payout's amounts equal its own bookings, none is empty, and 18,900 is owed in total (bad cases: ${bad}${detail.length ? " e.g. " + detail.join(", ") : ""})`, bad === 0); }

  // ===== recording =====
  world(); await bk(W.e1); const pr = (await O.createPayouts(db, { now: NOW, actorId: W.admin.id })).created[0]; const rec = (o: any) => O.recordPayout(db, pr.id, { actorId: W.admin.id, now: NOW, ...o });
  let x: any = await rec({ outcome: "SENT" }); t("RECORD: 'sent' needs the M-Pesa receipt", x.ok === false && /receipt/.test(x.error) && row("hostPayout", pr.id).status === "PENDING");
  for (const bad of ["abc", "QGH7 <b>", "x".repeat(41), "QGH7;DROP"]) { x = await rec({ outcome: "SENT", reference: bad }); if (x.ok) break; } t("RECORD: malformed receipts (too short, tags, too long, odd characters) are refused", x.ok === false && row("hostPayout", pr.id).status === "PENDING");
  x = await rec({ outcome: "CANCEL" }); t("RECORD: cancelling needs a reason", x.ok === false && /why/.test(x.error));
  x = await rec({ outcome: "SENT", reference: " QGH7PAY001 " }); const after = row("hostPayout", pr.id);
  t("RECORD (sent): becomes PAID with the receipt (trimmed), time and who recorded it; the bookings stay attached to it", x.ok && after.status === "PAID" && after.reference === "QGH7PAY001" && after.processedAt instanceof Date && after.processedById === W.admin.id && T.booking.filter((b: any) => b.payoutId === pr.id).length === 1);
  x = await rec({ outcome: "SENT", reference: "QGH7PAY002" }); t("RECORD: recording the same payout again is refused and does NOT overwrite the receipt", x.ok === false && /already been recorded/.test(x.error) && row("hostPayout", pr.id).reference === "QGH7PAY001");
  x = await rec({ outcome: "CANCEL", note: "changed my mind" }); t("RECORD: a PAID payout can't be cancelled afterwards (the bookings stay paid)", x.ok === false && row("hostPayout", pr.id).status === "PAID" && T.booking.filter((b: any) => b.payoutId === pr.id).length === 1);
  x = await O.recordPayout(db, "ghost", { outcome: "SENT", reference: "QGH7PAY003", actorId: W.admin.id, now: NOW }); t("RECORD: an unknown payout id is refused", x.ok === false);
  world(); await bk(W.e1); await bk(W.e1); const pc = (await O.createPayouts(db, { now: NOW, actorId: W.admin.id })).created[0]; x = await O.recordPayout(db, pc.id, { outcome: "CANCEL", note: "Number was wrong", actorId: W.admin.id, now: NOW });
  t("RECORD (cancel): becomes CANCELLED with the reason, and its bookings are RELEASED (no longer attached)", x.ok && row("hostPayout", pc.id).status === "CANCELLED" && row("hostPayout", pc.id).note === "Number was wrong" && T.booking.every((b: any) => b.payoutId === null));
  const again = await O.createPayouts(db, { now: NOW, actorId: W.admin.id }); t("…and the released bookings are picked up by the next payout (the cancelled one is never reused)", again.created.length === 1 && again.created[0].bookingCount === 2 && again.created[0].id !== pc.id);
  const racers = await Promise.all([O.recordPayout(db, again.created[0].id, { outcome: "SENT", reference: "QGH7RACE01", actorId: W.admin.id, now: NOW }), O.recordPayout(db, again.created[0].id, { outcome: "SENT", reference: "QGH7RACE02", actorId: W.sup.id, now: NOW }), O.recordPayout(db, again.created[0].id, { outcome: "CANCEL", note: "second thoughts", actorId: W.sup.id, now: NOW })]);
  t("🔒 RACE: two admins mark the same payout SENT and a third cancels it, all at once -> exactly one is recorded; the receipt kept is the winner's; if SENT won the bookings stay attached, and the payout is never both PAID and released", racers.filter((q: any) => q.ok).length === 1 && (() => { const pp = row("hostPayout", again.created[0].id); const att = T.booking.filter((b: any) => b.payoutId === pp.id).length; return pp.status === "PAID" ? (/QGH7RACE0[12]/.test(pp.reference) && att === 2) : (pp.status === "CANCELLED" && att === 0 && pp.reference === null); })());

  // ===== what a host sees =====
  world(); await bk(W.e1); await bk(W.e1, { status: "CONFIRMED", startsAt: at(4), completedAt: null }); await bk(W.e1, { startsAt: at(-0.5), completedAt: at(-0.5), paidAmount: 2000 }); await bk(W.e2, { paidAmount: 9999 });
  const ov = await O.hostOverview(db, W.h1.id, NOW); t("HOST OVERVIEW: payable 5,400 (6,000 less 10%), waiting 1,800 (2,000 less 10%), upcoming 5,400; the settings are shown; only THIS host's money is counted (the other host's 9,999 isn't)", ov.payable.net === 5400 && ov.waiting.net === 1800 && ov.upcoming.net === 5400 && ov.settings.commissionPercent === 10 && ov.payable.gross === 6000);
  await O.createPayouts(db, { now: NOW, actorId: W.admin.id }); const ov2 = await O.hostOverview(db, W.h1.id, NOW); t("HOST OVERVIEW: once prepared, what was payable now appears as a payout (amount, destination, its bookings with references), and the 'payable' figure drops to zero", ov2.payable.net === 0 && ov2.payouts.length === 1 && ov2.payouts[0].amount === 5400 && ov2.payouts[0].bookings.length === 1 && /^VT-/.test(ov2.payouts[0].bookings[0].reference) && ov2.payouts[0].destination === "254712345678");
  const ov3 = await O.hostOverview(db, W.h3.id, NOW); t("HOST OVERVIEW: another host sees none of it", ov3.payouts.length === 0 && ov3.payable.net === 0 && ov3.upcoming.net === 0);

  // ===== PROPERTY: money is never created, lost or paid twice =====
  { let seed = 20261008; const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n); let violations = 0, steps = 0; const q0 = console.error; console.error = () => {};
    for (let sc = 0; sc < 100; sc++) {
      world(); await O.saveSettings(db, { commissionPercent: [0, 7, 10, 15, 33][rnd(5)], holdDays: rnd(3) }, W.admin.id); const hosts = [W.e1, W.e2]; W.h2.payoutPhone = rnd(2) ? "0733 222 111" : null;
      for (let step = 0; step < 12; step++) {
        steps++; const op = rnd(6); const run: Promise<any>[] = [];
        if (op === 0) await bk(hosts[rnd(2)], { paidAmount: 500 * (1 + rnd(20)), refundedAmount: rnd(3) === 0 ? 250 : 0, startsAt: at(-rnd(8)), completedAt: at(-rnd(8)), status: ["COMPLETED", "NO_SHOW", "CANCELLED"][rnd(3)] });
        else if (op === 1 || op === 2) for (let k = 0; k < 1 + rnd(3); k++) run.push(O.createPayouts(db, { now: NOW, actorId: W.admin.id }));
        else if (op === 3) { const pend = T.hostPayout.filter((p: any) => p.status === "PENDING"); if (pend.length) { const p = pend[rnd(pend.length)]; run.push(O.recordPayout(db, p.id, { outcome: "SENT", reference: "QGH7P" + rnd(9999), actorId: W.admin.id, now: NOW })); if (rnd(2)) run.push(O.recordPayout(db, p.id, { outcome: "CANCEL", note: "again", actorId: W.sup.id, now: NOW })); } }
        else if (op === 4) { const pend = T.hostPayout.filter((p: any) => p.status === "PENDING"); if (pend.length) run.push(O.recordPayout(db, pend[rnd(pend.length)].id, { outcome: "CANCEL", note: "wrong number", actorId: W.admin.id, now: NOW })); }
        else W.h2.payoutPhone = rnd(2) ? "0744 555 666" : null;
        await Promise.all(run);
        // the invariants, checked after every step
        const live = T.hostPayout.filter((p: any) => p.status !== "CANCELLED"); const attached = T.booking.filter((b: any) => b.payoutId);
        const ids = new Set(T.hostPayout.map((p: any) => p.id));
        const ok1 = attached.every((b: any) => ids.has(b.payoutId) && row("hostPayout", b.payoutId).status !== "CANCELLED"); // nothing is left attached to a cancelled payout
        const ok2 = live.every((p: any) => { const bs2 = attached.filter((b: any) => b.payoutId === p.id); const tt = P.totalsFor(bs2, p.commissionPercent); return bs2.length === p.bookingCount && tt.gross === p.grossAmount && tt.commission === p.commissionAmount && tt.net === p.amount && p.amount > 0 && p.grossAmount - p.commissionAmount === p.amount; }); // each payout adds up to its own bookings
        const ok3 = attached.every((b: any) => row("experience", b.experienceId).ownerId === row("hostPayout", b.payoutId).hostId); // a booking is only ever paid to ITS host
        const ok4 = T.hostPayout.every((p: any) => p.status !== "PAID" || (p.reference && p.processedAt)); // a paid payout always has its receipt
        if (!(ok1 && ok2 && ok3 && ok4)) violations++;
      }
    } console.error = q0;
    t(`PROPERTY — MONEY CONSERVATION: 100 random scenarios × 12 steps (${steps} steps: new earning bookings, 1–3 simultaneous 'prepare' calls, simultaneous 'sent'/'cancel' on the same payout, hosts adding and removing their number, random commission and hold) — after EVERY step: no booking is attached to a cancelled payout; every payout's amounts equal its own bookings exactly (gross − commission = amount, none empty); every booking is paid only to its own host; every paid payout has a receipt (violations: ${violations})`, violations === 0 && steps >= 1200); }

  // ===== the actions: who may do what =====
  world(); const B = await bk(W.e1); const callPhone = (u: any, v: string) => { as(u); return A.savePayoutPhone(v); };
  let a: any = await callPhone(W.h1, "0799 888 777"); t("PHONE: a host can set their own payout number; it is stored normalised and the confirmation shows it MASKED", a.ok && row("user", W.h1.id).payoutPhone === "254799888777" && /2547••••8777/.test(a.message) && !/254799888777/.test(a.message));
  t("PHONE: changing it leaves an audit entry (masked, never the full number); saving the same number again adds none", T.adminAuditLog.length === 1 && T.adminAuditLog[0].action === "payout.phone" && !/254799888777/.test(JSON.stringify(T.adminAuditLog)) && /2547••••8777/.test(T.adminAuditLog[0].detail) && (await callPhone(W.h1, "0799888777"), T.adminAuditLog.length === 1));
  for (const bad of ["", "0612345678", "+44 7911 123456", "abc", "0712 345", "07123456789"]) { a = await callPhone(W.h1, bad); if (a.ok) break; } t("PHONE: non-Safaricom or malformed numbers are refused with a helpful message, and the saved number is unchanged", a.ok === false && /Safaricom/.test(a.error) && row("user", W.h1.id).payoutPhone === "254799888777");
  for (const [label, u] of [["a member", W.member], ["a seller", W.seller], ["an editor", W.editor]] as any[]) { a = await callPhone(u, "0712345678"); t(`PHONE: ${label} can't set a payout number`, a.ok === false && /Only hosts/.test(a.error) && row("user", u.id).payoutPhone === null); }
  a = await callPhone(null, "0712345678"); t("PHONE: signed-out is refused", a.ok === false);
  const susp = addUser({ role: "PARTNER", suspendedAt: new Date(), email: "s@h.co" }); a = await callPhone(susp, "0712345678"); t("PHONE: a SUSPENDED host (checked in the database) is refused", a.ok === false && row("user", susp.id).payoutPhone === null);
  a = await callPhone(W.admin, "0711000111"); t("PHONE: an admin who also hosts may set their own", a.ok && row("user", W.admin.id).payoutPhone === "254711000111");
  t("PHONE: it only ever changes the CALLER's row (no other account's number moved)", row("user", W.h2.id).payoutPhone === null && row("user", W.h3.id).payoutPhone === "0612345678");
  { const rl = addUser({ role: "PARTNER", email: "rl@h.co" }); let ok = 0, stop = 0; for (let i = 0; i < 12; i++) { as(rl); const z = await A.savePayoutPhone(i % 2 ? "0711111111" : "0722222222"); if (/lot of times/.test((z as any).error ?? "")) stop++; else ok++; } t(`PHONE rate limit: 10 changes an hour, then a polite stop (allowed ${ok}, stopped ${stop})`, ok === 10 && stop === 2); }
  as(W.admin); a = await A.savePayoutSettingsAction("12", "4"); t("SETTINGS action: an admin saves them; the message says they apply to payouts prepared from now on; an audit entry is written", a.ok && /from now on/.test(a.message) && (await O.getSettings(db)).commissionPercent === 12 && T.adminAuditLog.some((e: any) => e.action === "payout.settings" && /12%/.test(e.detail)));
  a = await A.savePayoutSettingsAction("60", "4"); t("SETTINGS action: out-of-range values are refused and nothing changes", a.ok === false && (await O.getSettings(db)).commissionPercent === 12);
  for (const [label, u] of [["a host", W.h1], ["an editor", W.editor], ["a member", W.member], ["nobody", null]] as any[]) { as(u); a = await A.savePayoutSettingsAction("0", "0"); t(`SETTINGS action: ${label} is refused (commission is a money setting)`, a.ok === false && /Admin access/.test(a.error) && (await O.getSettings(db)).commissionPercent === 12); }
  world(); await bk(W.e1); await bk(W.e2); W.h3.payoutPhone = null; for (const [label, u] of [["a host", W.h1], ["an editor", W.editor], ["a seller", W.seller], ["nobody", null]] as any[]) { as(u); a = await A.preparePayouts(null); t(`PREPARE action: ${label} is refused and nothing is attached`, a.ok === false && /Admin access/.test(a.error) && T.hostPayout.length === 0); }
  as(W.admin); a = await A.preparePayouts(null); t("PREPARE action: an admin prepares; the message totals it (KES 5,400) and NAMES the host who was skipped and why; audit entries are written", a.ok && /Prepared 1 payout/.test(a.message) && /KES 5,400/.test(a.message) && /No Number — they haven't registered a payout number/.test(a.message) && T.adminAuditLog.some((e: any) => e.action === "payout.prepare"));
  world(); await bk(W.e1); as(W.sup); await A.preparePayouts(null); a = await A.preparePayouts(null); t("PREPARE action: when nothing is payable it says so plainly (and creates nothing)", a.ok && /Nothing is payable right now/.test(a.message) && T.hostPayout.length === 1);
  world(); await bk(W.e2); as(W.sup); a = await A.preparePayouts(null); t("PREPARE action: when the only payable earnings belong to a host with no number, it creates nothing and says who and why", a.ok && /Skipped: No Number/.test(a.message) && !/Prepared/.test(a.message) && T.hostPayout.length === 0);
  world(); await bk(W.e1); as(W.admin); await A.preparePayouts(W.h2.id); t("PREPARE action for a different host only touches that host", T.hostPayout.length === 0);
  world(); await bk(W.e1); as(W.admin); await A.preparePayouts(null); const pid = T.hostPayout[0].id; sent.length = 0;
  for (const [label, u] of [["a host (even the payout's own host)", W.h1], ["an editor", W.editor], ["nobody", null]] as any[]) { as(u); a = await A.recordPayoutAction(pid, "SENT", "QGH7ABC123", ""); t(`RECORD action: ${label} is refused`, a.ok === false && /Admin access/.test(a.error) && row("hostPayout", pid).status === "PENDING"); }
  as(W.admin); a = await A.recordPayoutAction(pid, "BANANA" as any, "QGH7ABC123", ""); t("RECORD action: an invented outcome is refused", a.ok === false && row("hostPayout", pid).status === "PENDING");
  a = await A.recordPayoutAction(pid, "SENT", "QGH7ABC123", ""); const mail = sent[0];
  t("RECORD action (sent): marks it paid and EMAILS THE HOST with the amount, the receipt and a MASKED number — the full number is never in the email", a.ok && /host has been emailed/.test(a.message) && sent.length === 1 && mail.to === "hosea@host.co" && /KES 5,400/.test(mail.subject + mail.text) && /QGH7ABC123/.test(mail.text) && /2547••••5678/.test(mail.text) && !/254712345678/.test(mail.text));
  t("RECORD action: the audit entry says what was sent and to which (masked) number, with the receipt — never the full number", T.adminAuditLog.some((e: any) => e.action === "payout.sent" && /KES 5,400/.test(e.detail) && /2547••••5678/.test(e.detail) && /QGH7ABC123/.test(e.detail)) && !/254712345678/.test(JSON.stringify(T.adminAuditLog)));
  a = await A.recordPayoutAction(pid, "SENT", "QGH7ABC999", ""); t("RECORD action: a second record is refused and no second email goes out", a.ok === false && sent.length === 1);
  world(); await bk(W.e1); as(W.admin); await A.preparePayouts(null); mailFails = true; const q1 = console.error; console.error = () => {}; a = await A.recordPayoutAction(T.hostPayout[0].id, "SENT", "QGH7ABC123", ""); console.error = q1; mailFails = false; t("RECORD action: if the email can't be sent the payout is STILL recorded as paid (a mail outage never loses a payment record)", a.ok && T.hostPayout[0].status === "PAID");
  world(); await bk(W.e1); as(W.admin); await A.preparePayouts(null); a = await A.recordPayoutAction(T.hostPayout[0].id, "CANCEL", "", "Wrong number on file"); t("RECORD action (cancel): releases the bookings, sends the host NO email, and the audit entry carries the reason", a.ok && T.booking[0].payoutId === null && sent.length === 0 && T.adminAuditLog.some((e: any) => e.action === "payout.cancel" && /Wrong number on file/.test(e.detail)));
  { world(); await bk(W.e1); as(W.admin); let ok = 0, stop = 0; for (let i = 0; i < 32; i++) { const z: any = await A.preparePayouts(null); if (/lot of requests/.test(z.error ?? "")) stop++; else ok++; } t(`PREPARE rate limit: 30 an hour, then a polite stop (allowed ${ok}, stopped ${stop})`, ok === 30 && stop === 2); }

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} PAYOUT OPERATION CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
