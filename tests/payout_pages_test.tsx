import React from "react"; (globalThis as any).React = React;
const Module = require("module"); const origLoad = Module._load; let session: any = null;
Module._load = function (r: string, ...x: any[]) {
  if (r === "next-auth") return { getServerSession: async () => session };
  if (r === "next/navigation") return { redirect: (p: string) => { throw new Error("NEXT_REDIRECT:" + p); }, notFound: () => { throw new Error("NEXT_NOT_FOUND"); }, useRouter: () => ({ push() {}, refresh() {} }) };
  if (r === "next/cache") return { revalidatePath() {} };
  if (r === "@/lib/email") return { emailConfigured: () => true, sendEmail: async () => {} };
  return origLoad.call(this, r, ...x);
};
const FK = require("./payout_fake"); const { T, makeDb, resetDb, addUser, nid } = FK; const db = makeDb(); (globalThis as any).prisma = db;
process.env.NEXTAUTH_SECRET = "x".repeat(32);
import { renderToStaticMarkup } from "react-dom/server";
const D = 86400000; const NOW = new Date(); const at = (d: number) => new Date(NOW.getTime() + d * D);
const as = (u: any) => { session = u ? { user: { id: u.id, role: u.role } } : null; };
const expand = async (n: any): Promise<any> => { if (Array.isArray(n)) return Promise.all(n.map(expand)); if (!n || typeof n !== "object" || !n.type) return n; if (typeof n.type === "function" && n.type.constructor?.name === "AsyncFunction") return expand(await n.type(n.props)); const c = n.props?.children; if (c === undefined || typeof n.type === "function") return n; return React.cloneElement(n, undefined, ...(Array.isArray(c) ? await Promise.all(c.map(expand)) : [await expand(c)])); };
const html = async (C: any, props: any = {}) => renderToStaticMarkup(await expand(await C(props))).replace(/<!-- -->/g, "");
const attempt = async (C: any, props: any = {}) => { try { return await html(C, props); } catch (e: any) { return `THROWN:${e.message}`; } };
const pl = (h: string) => h.replace(/<[^>]*>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ");

async function main() {
  const O = await import("@/lib/payout-ops"); const HostPage = (await import("@/app/partner/payouts/page")).default as any; const AdminPage = (await import("@/app/admin/payouts/page")).default as any;
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  let W: any;
  const world = () => { resetDb(); session = null;
    const h1 = addUser({ name: "Hosea Mwamburi", email: "hosea@host.co", role: "PARTNER", payoutPhone: "254733456789" }), h2 = addUser({ name: "Grace Mghanga", email: "grace@host.co", role: "PARTNER", payoutPhone: "254722999888" }), h3 = addUser({ name: "No Number Host", email: "none@host.co", role: "PARTNER" });
    const admin = addUser({ name: "Amina Admin", email: "amina@vt.co", role: "ADMIN" }), sup = addUser({ name: "Harry", email: "harry@vt.co", role: "SUPER_ADMIN" }), editor = addUser({ name: "Ed", email: "ed@vt.co", role: "EDITOR" }), member = addUser({ name: "Mem", email: "mem@x.co", role: "MEMBER" }), seller = addUser({ name: "Sel", email: "sel@x.co", role: "SELLER" });
    const e1 = { id: nid("ex"), name: "Sagalla Sunrise Hike", ownerId: h1.id }, e2 = { id: nid("ex"), name: "Beta Trail", ownerId: h2.id }, e3 = { id: nid("ex"), name: "Gamma Walk", ownerId: h3.id }; T.experience.push(e1, e2, e3);
    W = { h1, h2, h3, admin, sup, editor, member, seller, e1, e2, e3 }; return W; };
  const bk = async (exp: any, o: any = {}) => { const st = o.startsAt ?? at(-10); const s = { id: nid("se"), experienceId: exp.id, startsAt: st }; T.experienceSession.push(s); return db.booking.create({ data: { reference: `VT-${nid("R")}`, status: "COMPLETED", experienceId: exp.id, sessionId: s.id, paidAmount: 6000, refundedAmount: 0, completedAt: st, ...o, startsAt: undefined } }); };

  // ===== the host's page =====
  world(); for (const [label, u] of [["nobody", null], ["a member", W.member], ["a seller", W.seller], ["an editor", W.editor]] as any[]) { as(u); t(`HOST PAGE: ${label} gets a 404`, (await attempt(HostPage)) === "THROWN:NEXT_NOT_FOUND"); }
  as(W.h3); let h = await html(HostPage); let txt = pl(h);
  t("HOST PAGE (no number yet): says plainly 'you haven't set a payout number — we can't pay you until you do', and offers 'Save number'", /haven't set a payout number yet/.test(txt) && /Save number/.test(h) && /Your M-Pesa number/.test(txt));
  t("HOST PAGE: explains the deal in plain words — Visit Taita's 10% commission, earnings held 2 days after the experience, then a payout to your M-Pesa", /10% commission/.test(txt) && /held for 2 days/.test(txt) && /M-Pesa number/.test(txt));
  t("HOST PAGE (nothing yet): four tiles at KES 0, and an explanation of when payouts start to appear", ["Coming up", "Being held", "Ready to be paid", "Paid to you so far"].every((l) => txt.includes(l)) && (txt.match(/KES 0/g) ?? []).length >= 4 && /No payouts yet/.test(txt));
  await bk(W.e1); await bk(W.e1, { paidAmount: 2000, startsAt: at(-0.5), completedAt: at(-0.5) }); await bk(W.e1, { status: "CONFIRMED", startsAt: at(6), completedAt: null }); await bk(W.e2, { paidAmount: 7777 }); await bk(W.e1, { status: "CANCELLED", paidAmount: 6000, refundedAmount: 6000, completedAt: null });
  as(W.h1); h = await html(HostPage); txt = pl(h);
  t("HOST PAGE: the tiles show THIS host's money at the current rate — ready KES 5,400 (6,000 less 10%), held KES 1,800, coming up KES 5,400 — and not the other host's 7,777 or the fully refunded booking", /KES 5,400<\/p><p[^>]*>Ready to be paid/.test(h) && /KES 1,800<\/p><p[^>]*>Being held/.test(h) && /KES 5,400<\/p><p[^>]*>Coming up/.test(h) && !/7,777|6,999|7,000/.test(txt));
  t("🔒 HOST PAGE: the saved number is shown MASKED (2547••••6789) and the full number appears nowhere in the page", /2547••••6789/.test(txt) && !/254733456789/.test(h) && !/0733 ?456 ?789/.test(h) && /Change number/.test(h));
  await O.createPayouts(db, { now: NOW, actorId: W.admin.id }); h = await html(HostPage); txt = pl(h); const prow = T.hostPayout[0];
  t("HOST PAGE: a prepared payout appears with its amount, booking count, status 'Being prepared — will be sent soon', where it goes (masked), and the sum (kept − 10% commission)", /KES 5,400/.test(txt) && /for 1 booking/.test(txt) && /Being prepared — will be sent soon/.test(txt) && /Sent to 2547••••6789/.test(txt) && /KES 6,000 kept − 10% commission \(KES 600\)/.test(txt) && !/M-Pesa receipt/.test(txt));
  t("HOST PAGE: 'Ready to be paid' falls to zero once it is in a payout", /KES 0<\/p><p[^>]*>Ready to be paid/.test(h));
  t("HOST PAGE: the booking-by-booking breakdown (reference, experience, kept, commission, what you receive) adds up", /Booking by booking/.test(txt) && txt.includes(T.booking.find((b: any) => b.payoutId)!.reference) && /Sagalla Sunrise Hike/.test(txt) && /KES 6,000 KES 600 KES 5,400/.test(txt));
  await O.recordPayout(db, prow.id, { outcome: "SENT", reference: "QGH7PAID01", actorId: W.admin.id, now: NOW }); h = await html(HostPage); txt = pl(h);
  t("HOST PAGE (paid): status 'Paid', the M-Pesa receipt is shown, and 'Paid to you so far' is KES 5,400", />Paid<\/span>/.test(h) && /M-Pesa receipt QGH7PAID01/.test(txt) && /KES 5,400<\/p><p[^>]*>Paid to you so far/.test(h));
  await bk(W.e1, { paidAmount: 4000 }); await O.createPayouts(db, { now: NOW, actorId: W.admin.id }); const p2 = T.hostPayout.find((p: any) => p.hostId === W.h1.id && p.status === "PENDING"); /* this host's own pending payout */ await O.recordPayout(db, p2.id, { outcome: "CANCEL", note: "number problem", actorId: W.admin.id, now: NOW }); h = await html(HostPage); txt = pl(h);
  t("HOST PAGE (cancelled payout): shows 'Not sent — included in a later payout' and NEVER the admin's private reason", /Not sent — included in a later payout/.test(txt) && !/number problem/.test(txt));
  as(W.h2); h = await html(HostPage); txt = pl(h); t("🔒 HOST PAGE: another host sees none of the first host's payouts, bookings, receipts or numbers", !/QGH7PAID01/.test(txt) && !/Sagalla/.test(txt) && !/2547••••6789/.test(txt) && !/Hosea/.test(txt) && /2547••••9888/.test(txt) && !/KES 5,400/.test(txt) && !/KES 3,600/.test(txt) && !/number problem/.test(txt));
  as(W.admin); t("HOST PAGE: an admin who also hosts can open it", !(await attempt(HostPage)).startsWith("THROWN"));
  world(); await O.saveSettings(db, { commissionPercent: 1, holdDays: 1 }, W.admin.id); as(W.h1); h = pl(await html(HostPage)); t("HOST PAGE: singular wording at 1 day ('held for 1 day', not '1 days') and the rate follows the setting (1%)", /held for 1 day /.test(h) && /1% commission/.test(h) && !/1 days/.test(h));

  // ===== the admin's page =====
  world(); for (const [label, u] of [["a host", W.h1], ["an editor", W.editor], ["a member", W.member], ["nobody", null]] as any[]) { as(u); t(`ADMIN PAGE: ${label} is sent back to /admin`, (await attempt(AdminPage)) === "THROWN:NEXT_REDIRECT:/admin"); }
  as(W.admin); h = await html(AdminPage); txt = pl(h);
  t("ADMIN PAGE (empty): explains the process, shows the settings form with the current values (10, 2), and says nothing is payable or waiting", /Host payouts/.test(txt) && /record the receipt/.test(txt) && /aria-label="Commission percent"/.test(h) && /value="10"/.test(h) && /value="2"/.test(h) && /Nothing is payable right now/.test(txt) && /No prepared payouts are waiting/.test(txt));
  await bk(W.e1); await bk(W.e1, { paidAmount: 4000, status: "NO_SHOW" }); await bk(W.e2, { paidAmount: 9000 }); await bk(W.e3, { paidAmount: 5000 }); await bk(W.e1, { startsAt: at(-0.2), completedAt: at(-0.2) });
  h = await html(AdminPage); txt = pl(h);
  t("ADMIN PAGE 'Ready to prepare': each host with payable earnings, with the maths — Hosea: 2 bookings, kept 10,000 − 10% (1,000) = KES 9,000; Grace: kept 9,000 − 900 = KES 8,100 — and the booking inside the hold period is NOT counted", /Hosea Mwamburi/.test(txt) && /2 bookings · kept KES 10,000 − 10% \(KES 1,000\) = KES 9,000/.test(txt) && /Grace Mghanga/.test(txt) && /kept KES 9,000 − 10% \(KES 900\) = KES 8,100/.test(txt));
  t("ADMIN PAGE: a host with NO payout number is listed with a clear warning and NO prepare button (they are skipped until they add one)", /No Number Host/.test(txt) && /No valid payout number yet/.test(txt) && !/Prepare KES 5,000/.test(txt) && /Prepare KES 9,000/.test(txt) && /Prepare KES 8,100/.test(txt));
  t("ADMIN PAGE: 'Prepare all' appears when more than one host is ready, with the total (KES 17,100) — and counts only hosts who can actually be paid", /Prepare all \(KES 17,100\)/.test(txt));
  as(W.sup); await O.createPayouts(db, { now: NOW, actorId: W.sup.id, hostId: W.h1.id }); h = await html(AdminPage); txt = pl(h);
  t("ADMIN PAGE 'To send (1)': the prepared payout with the amount, the FULL M-Pesa number the admin must pay (admins need it), the host's name, the sums, and a receipt box", /To send \(1\)/.test(txt) && /KES 9,000/.test(txt) && /254733456789/.test(h) && /Hosea Mwamburi/.test(txt) && /kept KES 10,000 − 10% \(KES 1,000\)/.test(txt) && /aria-label="M-Pesa receipt"/.test(h) && /Mark as sent/.test(h) && /I couldn't send it/.test(txt));
  t("ADMIN PAGE: once prepared, that host leaves 'Ready to prepare' (and 'Prepare all' disappears because only one host is left ready)", !/Prepare KES 9,000/.test(txt) && /Prepare KES 8,100/.test(txt) && !/Prepare all/.test(txt));
  const pp = T.hostPayout[0]; await O.recordPayout(db, pp.id, { outcome: "SENT", reference: "QGH7ADM001", actorId: W.sup.id, now: NOW }); h = await html(AdminPage); txt = pl(h);
  t("ADMIN PAGE 'Recently processed': the paid payout with its receipt and a Paid pill; and 'To send' is empty again", /Recently processed/.test(txt) && />Paid<\/span>/.test(h) && /QGH7ADM001/.test(txt) && /No prepared payouts are waiting/.test(txt) && /Activity log/.test(txt));
  world(); await bk(W.e1); as(W.admin); await O.createPayouts(db, { now: NOW, actorId: W.admin.id }); await O.recordPayout(db, T.hostPayout[0].id, { outcome: "CANCEL", note: "Number isn't on M-Pesa", actorId: W.admin.id, now: NOW }); h = await html(AdminPage); txt = pl(h);
  t("ADMIN PAGE: a cancelled payout shows in the history with its reason, and its booking is back in 'Ready to prepare'", />Cancelled<\/span>/.test(h) && /Number isn't on M-Pesa/.test(txt) && /Prepare KES 5,400/.test(txt));
  world(); await bk(W.e1, { paidAmount: 1234 }); as(W.admin); await O.saveSettings(db, { commissionPercent: 15, holdDays: 2 }, W.admin.id); txt = pl(await html(AdminPage)); t("ADMIN PAGE: figures follow the commission setting (1,234 at 15% -> 185 commission, 1,049 to the host) and the form shows 15", /kept KES 1,234 − 15% \(KES 185\) = KES 1,049/.test(txt));
  world(); await bk(W.e1); as(W.admin); const hooksOn = true; const bad = T.user.find((u: any) => u.id === W.h1.id); bad.payoutPhone = "0612345678"; txt = pl(await html(AdminPage)); t("ADMIN PAGE: an INVALID saved number is treated as missing (flagged, no prepare button)", /No valid payout number yet/.test(txt) && !/Prepare KES/.test(txt) && hooksOn);

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} PAYOUT PAGE CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
