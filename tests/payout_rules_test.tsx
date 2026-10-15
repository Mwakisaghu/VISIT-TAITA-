async function main() {
  const P = await import("@/lib/payout"); const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const D = 86400000; const NOW = new Date("2026-10-20T12:00:00Z"); const at = (days: number) => new Date(NOW.getTime() + days * D);
  const bk = (o: Partial<any> = {}) => ({ id: "b", status: "COMPLETED", paidAmount: 6000, refundedAmount: 0, completedAt: at(-5), cancelledAt: null, sessionStartsAt: at(-5), payoutId: null, ...o });

  // ===== settings =====
  const v = (c: any, h: any) => P.validateSettings({ commissionPercent: c, holdDays: h });
  t("SETTINGS: 10% and 2 days are valid; 0% (no commission) and 50% (the cap) are valid; 0 days hold and 30 days are valid", [[10, 2], [0, 2], [50, 2], [10, 0], [10, 30]].every(([c, h]) => (v(c, h) as any).ok));
  t("SETTINGS: numbers typed into a form arrive as text ('12', ' 3 ') and are accepted when they are whole numbers", (v("12", " 3 ") as any).ok && (v("12", " 3 ") as any).values.commissionPercent === 12 && (v("12", " 3 ") as any).values.holdDays === 3);
  for (const [c, h, why] of [[51, 2, "51%"], [-1, 2, "negative commission"], [10.5, 2, "a fraction of a percent"], ["abc", 2, "text"], ["", 2, "blank"], [null, 2, "null"], [10, 31, "31 days"], [10, -1, "negative days"], [10, 1.5, "half a day"], [10, "", "blank days"], [NaN, 2, "NaN"], [Infinity, 2, "Infinity"]] as any[]) t(`SETTINGS refused: ${why}`, (v(c, h) as any).ok === false && /whole number/.test((v(c, h) as any).error));

  // ===== the arithmetic =====
  const s = (g: number, p: number) => P.splitAmount(g, p);
  t("SPLIT: 6,000 at 10% -> commission 600, host 5,400", s(6000, 10).commission === 600 && s(6000, 10).net === 5400);
  t("SPLIT rounds the commission to the nearest shilling and the host gets the rest: 2,555 at 10% -> 256 / 2,299 (commission + host always equals what was kept)", s(2555, 10).commission === 256 && s(2555, 10).net === 2299);
  t("SPLIT: 0% -> the host gets everything; 100% -> nothing; nothing kept -> nothing", s(5000, 0).net === 5000 && s(5000, 100).net === 0 && s(0, 10).net === 0);
  t("SPLIT never invents or loses a shilling, over every amount 0–5,000 at every whole percent 0–50", (() => { for (let g = 0; g <= 5000; g += 7) for (let p = 0; p <= 50; p++) { const r = s(g, p); if (r.commission + r.net !== g || r.commission < 0 || r.net < 0 || !Number.isInteger(r.commission)) return false; } return true; })());
  t("SPLIT is safe with nonsense (negative, NaN, huge percent): amounts clamp to sensible whole numbers", s(-100, 10).net === 0 && s(NaN, 10).gross === 0 && s(1000, NaN).net === 1000 && s(1000, 500).net === 0 && s(1000, -5).net === 1000);
  const rows = [{ paidAmount: 2555, refundedAmount: 0 }, { paidAmount: 4000, refundedAmount: 2000 }, { paidAmount: 999, refundedAmount: 0 }];
  const tot = P.totalsFor(rows, 10); t("TOTALS: commission is rounded booking by booking (256 + 200 + 100 = 556) so the statement adds up line by line; kept = paid − refunds; count is right", tot.gross === 2555 + 2000 + 999 && tot.commission === 256 + 200 + 100 && tot.net === tot.gross - tot.commission && tot.count === 3);
  t("kept amount: paid − refunded, never negative", P.keptAmount({ paidAmount: 6000, refundedAmount: 2500 }) === 3500 && P.keptAmount({ paidAmount: 100, refundedAmount: 500 }) === 0);

  // ===== when does a booking earn, and when is it payable =====
  const cls = (o: any, hold = 2, now = NOW) => P.classify(bk(o), now, hold);
  t("PAYABLE: completed 5 days ago, held 2 days -> payable", cls({}) === "payable");
  t("WAITING: the hold hasn't passed — completed 1 day ago with a 2-day hold -> waiting; exactly 2 days -> payable (the boundary is inclusive)", cls({ completedAt: at(-1), sessionStartsAt: at(-1) }) === "waiting" && cls({ completedAt: at(-2), sessionStartsAt: at(-2) }) === "payable");
  t("hold of 0 days: payable as soon as it has happened", cls({ completedAt: at(-0.1), sessionStartsAt: at(-0.1) }, 0) === "payable" && cls({ completedAt: at(-1), sessionStartsAt: at(-1) }, 30) === "waiting");
  t("a NO-SHOW earns (it is never refunded) and is payable after the hold", cls({ status: "NO_SHOW" }) === "payable");
  t("UPCOMING: paid and confirmed but the experience hasn't happened -> upcoming (an estimate, not payable)", cls({ status: "CONFIRMED", completedAt: null, sessionStartsAt: at(3) }) === "upcoming");
  t("CONFIRMED and the start time has passed but nobody has marked it completed yet -> waiting (the job completes it 6 hours after the start)", cls({ status: "CONFIRMED", completedAt: null, sessionStartsAt: at(-0.1) }) === "waiting");
  t("CANCELLED with money kept (a strict-policy late cancellation: paid 6,000, refunded 3,000) -> the host earns the 3,000 once the session date has passed + the hold", cls({ status: "CANCELLED", paidAmount: 6000, refundedAmount: 3000, cancelledAt: at(-10), completedAt: null, sessionStartsAt: at(-5) }) === "payable" && cls({ status: "CANCELLED", paidAmount: 6000, refundedAmount: 3000, cancelledAt: at(-10), completedAt: null, sessionStartsAt: at(4) }) === "waiting");
  t("CANCELLED with everything refunded (host cancelled, full refund) -> nothing is owed to the host", cls({ status: "CANCELLED", paidAmount: 6000, refundedAmount: 6000, completedAt: null }) === "nothing");
  t("a deposit kept because the balance wasn't paid (cancelled by the system, deposit 1,800 kept) is earned by the host", cls({ status: "CANCELLED", paidAmount: 1800, refundedAmount: 0, completedAt: null, cancelledAt: at(-8), sessionStartsAt: at(-6) }) === "payable");
  for (const st of ["REQUESTED", "AWAITING_PAYMENT", "DECLINED", "EXPIRED"]) t(`a ${st} booking never earns anything (and unpaid ones keep nothing)`, cls({ status: st, paidAmount: 0 }) === "nothing");
  t("a booking with nothing paid earns nothing whatever its status", cls({ paidAmount: 0 }) === "nothing");
  t("IN PAYOUT: a booking already attached to a payout is never offered again", cls({ payoutId: "p1" }) === "in_payout");
  t("payableAt = the later of (session start, completed/cancelled time) plus the hold; null when it hasn't earned", P.payableAt(bk({ completedAt: at(-1), sessionStartsAt: at(-5) }), 2)!.getTime() === at(1).getTime() && P.payableAt(bk({ status: "CONFIRMED" }), 2) === null && P.earnedAt(bk({ status: "AWAITING_PAYMENT" })) === null);

  // ===== phone numbers and receipts =====
  for (const [raw, want] of [["0712 345 678", "254712345678"], ["+254 712 345 678", "254712345678"], ["254712345678", "254712345678"], ["712345678", "254712345678"], ["0112345678", "254112345678"], ["(0712)-345-678", "254712345678"]] as any[]) t(`PAYOUT NUMBER ${JSON.stringify(raw)} -> ${want}`, P.normalizePayoutPhone(raw) === want);
  for (const bad of ["", "12", "0612345678", "+44 7911 123456", "07123456789", "abc", "0712 345", null, undefined, 712345678, "254212345678", "2547123456789"]) t(`PAYOUT NUMBER ${JSON.stringify(bad)} is refused (only Safaricom numbers can be paid by M-Pesa)`, P.normalizePayoutPhone(bad) === null);
  t("masked number hides the middle (2547••••5678) and copes with short input", P.maskPhone("254712345678") === "2547••••5678" && P.maskPhone("12") === "••••");
  t("RECEIPT: 4–40 letters and digits only", P.validReceipt("QGH7ABC123") && P.validReceipt(" QGH7ABC123 ") && !P.validReceipt("abc") && !P.validReceipt("x".repeat(41)) && !P.validReceipt("QGH7 <b>") && !P.validReceipt("QGH7;DROP") && !P.validReceipt("") && !P.validReceipt(null));
  t("money display: KES with thousands separators", P.kes(5400) === "KES 5,400" && P.kes(0) === "KES 0" && P.kes(1234567) === "KES 1,234,567");

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} PAYOUT RULE CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
