import React from "react"; (globalThis as any).React = React;
const Module = require("module"); const origLoad = Module._load; let session: any = null;
const stk: any = { calls: [] as any[], fail: false, results: {} as Record<string, any>, n: 0 }; const pp: any = { calls: [] as any[], fail: false, results: {} as Record<string, any>, n: 0 };
Module._load = function (r: string, ...x: any[]) {
  if (r === "next-auth") return { getServerSession: async () => session };
  if (r === "next/cache") return { revalidatePath() {} };
  if (r === "@/lib/mpesa") { const real = origLoad.call(this, r, ...x); return { ...real, initiateStkPush: async (a: any) => { stk.calls.push(a); if (stk.fail) throw new Error("Daraja unreachable"); const n = ++stk.n; return { CheckoutRequestID: `ws_CO_${n}`, MerchantRequestID: `mr_${n}`, ResponseCode: "0", ResponseDescription: "ok", CustomerMessage: "ok" }; }, queryStkPushStatus: async (id: string) => { const q = stk.results[id]; if (!q) throw new Error("The transaction is being processed"); return { ResponseCode: "0", ResponseDescription: "", MerchantRequestID: "m", CheckoutRequestID: id, ResultCode: q.code, ResultDesc: q.desc ?? "" }; } }; }
  if (r === "@/lib/pesapal") return { submitOrderRequest: async (a: any) => { pp.calls.push(a); if (pp.fail) throw new Error("Pesapal down"); const n = ++pp.n; return { order_tracking_id: `pp-${n}`, merchant_reference: a.merchantReference, redirect_url: `https://pay.test/${n}` }; }, getTransactionStatus: async (id: string) => { const q = pp.results[id]; if (!q) return { payment_status_description: "PENDING", amount: 0, confirmation_code: "", order_tracking_id: id, merchant_reference: "", payment_method: "" }; if (q.throws) throw new Error(q.throws); return { payment_method: "VISA", amount: q.amount, confirmation_code: q.code ?? "CONF1", payment_status_description: q.status, merchant_reference: "x", order_tracking_id: id }; } };
  return origLoad.call(this, r, ...x);
};
const FK = require("./shop_fake"); const { T, makeDb, resetDb, addUser, hooks, nid } = FK; const db = makeDb(); (globalThis as any).prisma = db;
process.env.NEXT_PUBLIC_APP_URL = "https://visittaita.co.ke"; process.env.NEXTAUTH_SECRET = "x".repeat(32);
import fs from "fs";
const row = (t: string, id: string) => T[t].find((r: any) => r.id === id);
const cbBody = (id: string, code: number, amount?: number, receipt = "QGH7ABC123") => ({ Body: { stkCallback: { MerchantRequestID: "m", CheckoutRequestID: id, ResultCode: code, ResultDesc: code === 0 ? "ok" : "Request cancelled by user", ...(code === 0 ? { CallbackMetadata: { Item: [{ Name: "Amount", Value: amount ?? 2500 }, { Name: "MpesaReceiptNumber", Value: receipt }] } } : {}) } } });
let W: any;
const fresh = () => { resetDb(); stk.calls = []; stk.results = {}; stk.fail = false; stk.n = 0; pp.calls = []; pp.results = {}; pp.fail = false; pp.n = 0; const buyer = addUser({ name: "Jane Wanjiru", email: "jane@mail.com" }); const A = { id: nid("pr"), name: "Polo", price: 1000, inventory: 5 }, B = { id: nid("pr"), name: "Basket", price: 500, inventory: 3 }; T.product.push(A, B); session = { user: { id: buyer.id, role: "MEMBER" } }; W = { buyer, A, B, order: null }; };
// an order of A×2 + B×1 = 2,500 whose stock has already been taken (so A 5 and B 3 are what is left)
const mkOrder = async (over: any = {}, qtyA = 2) => { const order = await db.order.create({ data: { orderNumber: `TM-${nid("n")}`, buyerId: W.buyer.id, totalAmount: 2500, fulfillment: "PICKUP", ...over } }); T.orderItem.push({ id: nid("oi"), orderId: order.id, productId: W.A.id, quantity: qtyA, unitPrice: 1000 }, { id: nid("oi"), orderId: order.id, productId: W.B.id, quantity: 1, unitPrice: 500 }); W.order = order; return order; };
const pending = (o: any = {}) => mkOrder({ paymentStatus: "PENDING", paymentMethod: "MPESA", mpesaCheckoutRequestId: "ws_CO_1", ...o });
const cur = () => row("order", W.order.id); const stock = () => `${W.A.inventory}/${W.B.inventory}`;

async function main() {
  const SP = await import("@/lib/shop-payments"); const ACT = await import("@/lib/actions/payments"); const MC = await import("@/app/api/payments/mpesa/callback/route"); const IPN = await import("@/app/api/payments/pesapal/ipn/route");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, ok]);

  // ===== M-Pesa callbacks: nothing in the request is believed =====
  fresh(); await pending(); let handled = await SP.handleShopMpesaCallback(cbBody("ws_CO_1", 0, 2500) as any);
  t("🔒 FORGED SUCCESS: a callback claims the order was paid, but Safaricom, asked directly, has no record of it -> NOT paid (the free-goods hole)", handled === true && cur().paymentStatus === "PENDING" && cur().status === "PENDING" && cur().paidAt === null);
  fresh(); await pending(); stk.results["ws_CO_1"] = { code: "1032", desc: "Request cancelled by user" }; await SP.handleShopMpesaCallback(cbBody("ws_CO_1", 0, 2500) as any);
  t("🔒 FORGED SUCCESS vs Safaricom saying 'cancelled': Safaricom's answer wins — not paid, and failed by THAT answer", cur().paymentStatus === "FAILED" && cur().paidAt === null && cur().status === "PENDING");
  fresh(); await pending(); const forged = await SP.handleShopMpesaCallback(cbBody("ws_CO_1", 1032) as any);
  t("🔒 FORGED FAILURE: a callback claims 'cancelled' while Safaricom has no final answer -> NOT failed, stock NOT released (the old code let anyone fail any order and return its stock)", forged === true && cur().paymentStatus === "PENDING" && stock() === "5/3");
  stk.results["ws_CO_1"] = { code: "0" }; await SP.handleShopMpesaCallback(cbBody("ws_CO_1", 1032) as any);
  t("🔒 FORGED FAILURE vs a GENUINE payment: callback says 'cancelled', Safaricom says paid -> PAID (the truth wins)", cur().paymentStatus === "PAID" && cur().status === "CONFIRMED" && stock() === "5/3");
  fresh(); await pending(); stk.results["ws_CO_1"] = { code: "0" }; await SP.handleShopMpesaCallback(cbBody("ws_CO_1", 0, 2500, "QGH7REAL42") as any);
  t("REAL SUCCESS: Safaricom confirms and the amount matches -> PAID with receipt and time, CONFIRMED, stock untouched", cur().paymentStatus === "PAID" && cur().status === "CONFIRMED" && cur().mpesaReceiptNumber === "QGH7REAL42" && cur().paidAt instanceof Date && cur().paymentFailureReason === null && stock() === "5/3");
  fresh(); await pending(); stk.results["ws_CO_1"] = { code: "0" }; await SP.handleShopMpesaCallback(cbBody("ws_CO_1", 0, 1, "QGH7FAKE99") as any);
  t("🔒 AMOUNT CHECK: Safaricom confirms but the callback reports KES 1 on a 2,500 order -> NOT paid, flagged 'Amount mismatch … needs checking'", cur().paymentStatus === "PENDING" && /Amount mismatch/.test(cur().paymentFailureReason) && cur().status === "PENDING");
  fresh(); await pending(); stk.results["ws_CO_1"] = { code: "2001", desc: "The initiator information is invalid (wrong PIN)" }; await SP.handleShopMpesaCallback(cbBody("ws_CO_1", 2001) as any);
  t("REAL FAILURE: Safaricom confirms it failed -> FAILED with the reason, stock released (A 5→7, B 3→4)", cur().paymentStatus === "FAILED" && /PIN/.test(cur().paymentFailureReason) && stock() === "7/4");
  for (const wording of ["The service request is being processed", "Transaction is processing", "Request is pending", "in progress"]) { fresh(); await pending(); stk.results["ws_CO_1"] = { code: "1", desc: wording }; await SP.confirmShopMpesa(W.order.id); t(`STILL PROCESSING ('${wording}') stays PENDING — never failed on a non-answer`, cur().paymentStatus === "PENDING" && stock() === "5/3"); }
  fresh(); await pending(); stk.results["ws_CO_1"] = { code: "2001", desc: "wrong PIN" }; await Promise.all([SP.handleShopMpesaCallback(cbBody("ws_CO_1", 2001) as any), SP.handleShopMpesaCallback(cbBody("ws_CO_1", 2001) as any), SP.confirmShopMpesa(W.order.id), SP.confirmShopMpesa(W.order.id), ACT.getOrderPaymentStatus(W.order.id), SP.handleShopMpesaCallback(cbBody("ws_CO_1", 2001) as any)]);
  t("RACE (the double-restock bug): 3 callbacks, 2 checks and a page poll all report the same failure at once -> stock released EXACTLY ONCE (7/4), never inflated", cur().paymentStatus === "FAILED" && stock() === "7/4");
  fresh(); await pending(); stk.results["ws_CO_1"] = { code: "0" }; await Promise.all(Array.from({ length: 6 }, (_, i) => (i % 2 ? SP.confirmShopMpesa(W.order.id, { receipt: "QGH7R", amount: 2500 }) : SP.handleShopMpesaCallback(cbBody("ws_CO_1", 0, 2500, "QGH7R") as any))));
  t("RACE: the same success reported 6 times at once -> settled once (receipt kept, CONFIRMED)", cur().paymentStatus === "PAID" && cur().status === "CONFIRMED" && cur().mpesaReceiptNumber === "QGH7R" && stock() === "5/3");
  const paidAt = cur().paidAt.getTime(); await SP.handleShopMpesaCallback(cbBody("ws_CO_1", 0, 2500, "QGH7R") as any); await SP.handleShopMpesaCallback(cbBody("ws_CO_1", 1032) as any);
  t("DUPLICATE and CONTRADICTORY callbacks after it is paid change nothing (a later 'cancelled' can't undo a paid order or release its stock)", cur().paymentStatus === "PAID" && cur().paidAt.getTime() === paidAt && stock() === "5/3");
  fresh(); await pending({ paymentStatus: "PAID", status: "CONFIRMED", mpesaReceiptNumber: null }); await SP.handleShopMpesaCallback(cbBody("ws_CO_1", 0, 2500, "QGH7BACKFILL") as any); t("a receipt that was missing is filled in when the callback arrives after a poll already paid the order", cur().mpesaReceiptNumber === "QGH7BACKFILL");
  fresh(); await pending({ paymentStatus: "FAILED", paymentFailureReason: "timed out" }); W.A.inventory = 7; W.B.inventory = 4; stk.results["ws_CO_1"] = { code: "0" }; await SP.handleShopMpesaCallback(cbBody("ws_CO_1", 0, 2500, "QGH7LATE01") as any);
  t("LATE PAYMENT (after the order was failed and its stock released): never silent — stays FAILED but FLAGGED with the receipt for a person to refund or fulfil; stock not touched", cur().paymentStatus === "FAILED" && /A payment arrived after this order was marked failed/.test(cur().paymentFailureReason) && /QGH7LATE01/.test(cur().paymentFailureReason) && stock() === "7/4");
  const flagged = cur().paymentFailureReason; await SP.handleShopMpesaCallback(cbBody("ws_CO_1", 0, 2500, "QGH7LATE02") as any); t("…and the flag isn't rewritten by a repeat", cur().paymentFailureReason === flagged);
  fresh(); await pending({ paymentStatus: "FAILED", paymentFailureReason: "timed out" }); await SP.confirmShopMpesa(W.order.id); t("a FAILED order is only re-examined when a callback brings a receipt (page polls don't hammer Safaricom)", cur().paymentFailureReason === "timed out");
  { fresh(); const bads: any[] = [null, undefined, {}, { Body: {} }, { Body: { stkCallback: {} } }, { Body: { stkCallback: { CheckoutRequestID: 123 } } }, { Body: { stkCallback: { CheckoutRequestID: { $ne: "" } } } }, { Body: { stkCallback: { CheckoutRequestID: "" } } }, cbBody("unknown-id", 0)]; let ok = true; const oks: any[] = []; for (const b of bads) { try { oks.push(await SP.handleShopMpesaCallback(b)); } catch { ok = false; } } t("CALLBACK robustness: null, empty, wrong-typed, injected-operator and unknown bodies -> no crash, 'not a shop order'", ok && oks.every((x) => x === false)); }

  // ===== the callback route =====
  const post = (body: any) => MC.POST(new Request("https://x/api/payments/mpesa/callback", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) })) as any;
  fresh(); await pending(); let r: any = await post(cbBody("ws_CO_1", 0, 2500));
  t("ROUTE: always answers Safaricom with HTTP 200 and the exact acknowledgement it expects", r.status === 200 && JSON.stringify(await r.json()) === '{"ResultCode":0,"ResultDesc":"Accepted"}');
  t("🔒 ROUTE: a forged success posted to the real endpoint does not pay the order", cur().paymentStatus === "PENDING");
  stk.results["ws_CO_1"] = { code: "0" }; await post(cbBody("ws_CO_1", 0, 2500, "QGH7ROUTE1")); t("ROUTE: once Safaricom confirms, the same endpoint settles it", cur().paymentStatus === "PAID" && cur().mpesaReceiptNumber === "QGH7ROUTE1");
  { const codes: number[] = []; for (const b of ["not json", "{}", "null", "[]", '{"Body":{"stkCallback":{"CheckoutRequestID":"nope","ResultCode":0}}}']) codes.push((await post(b)).status); t("ROUTE: garbage and unknown callbacks are acknowledged quietly (never an error that makes Safaricom retry forever)", codes.every((c) => c === 200)); }
  { const q0 = console.error; console.error = () => {}; hooks.throwOn = (table: string, op: string) => { if (table === "order" && op === "findFirst") throw new Error("db hiccup"); }; r = await post(cbBody("ws_CO_1", 0)); hooks.throwOn = undefined; console.error = q0; t("ROUTE: even if the database errors, Safaricom still gets its 200", r.status === 200); }

  // ===== Pesapal =====
  const card = (o: any = {}) => mkOrder({ paymentStatus: "PENDING", paymentMethod: "CARD", pesapalOrderTrackingId: "pp-9", ...o });
  fresh(); await card(); await SP.confirmShopPesapal("pp-9"); t("PESAPAL: while Pesapal says PENDING nothing changes", cur().paymentStatus === "PENDING" && stock() === "5/3");
  pp.results["pp-9"] = { status: "COMPLETED", amount: 100 }; await SP.confirmShopPesapal("pp-9"); t("🔒 PESAPAL AMOUNT CHECK: COMPLETED for KES 100 on a 2,500 order -> NOT paid, flagged (the old code never checked)", cur().paymentStatus === "PENDING" && /Amount mismatch/.test(cur().paymentFailureReason));
  pp.results["pp-9"] = { status: "COMPLETED", amount: 2500, code: "CONF77" }; await SP.confirmShopPesapal("pp-9"); t("PESAPAL: COMPLETED for the right amount -> PAID with the confirmation code, CONFIRMED", cur().paymentStatus === "PAID" && cur().status === "CONFIRMED" && cur().pesapalConfirmationCode === "CONF77");
  for (const st of ["FAILED", "INVALID", "REVERSED"]) { fresh(); await card(); pp.results["pp-9"] = { status: st, amount: 2500 }; await Promise.all([SP.confirmShopPesapal("pp-9"), SP.confirmShopPesapal("pp-9"), SP.handleShopPesapalIpn("pp-9"), SP.handleShopPesapalIpn("pp-9")]); t(`PESAPAL ${st} (reported by 4 callers at once): fails once with the reason and releases stock ONCE (7/4)`, cur().paymentStatus === "FAILED" && cur().paymentFailureReason === `Pesapal: ${st}` && stock() === "7/4"); }
  fresh(); await card(); pp.results["pp-9"] = { throws: "network" }; { const q1 = console.error; console.error = () => {}; await SP.confirmShopPesapal("pp-9"); console.error = q1; } t("PESAPAL: if Pesapal can't be reached the order simply stays pending", cur().paymentStatus === "PENDING");
  { const before = JSON.stringify(T.order); const r1 = [await SP.handleShopPesapalIpn("unknown-id"), await SP.handleShopPesapalIpn(""), await SP.handleShopPesapalIpn(undefined as any), await SP.handleShopPesapalIpn({ $ne: "" } as any)]; await SP.confirmShopPesapal("x".repeat(500)); await SP.confirmShopPesapal("" as any); t("PESAPAL: unknown, empty, wrong-typed and absurdly long tracking ids are ignored — nothing changes", r1.every((x) => x === false) && JSON.stringify(T.order) === before); }
  fresh(); await card(); pp.results["pp-9"] = { status: "COMPLETED", amount: 2500 }; const ipn = await IPN.GET(new Request("https://x/api/payments/pesapal/ipn?OrderTrackingId=pp-9&OrderMerchantReference=m&OrderNotificationType=IPNCHANGE")) as any;
  t("IPN ROUTE: acknowledges in Pesapal's shape and settles the order from Pesapal's own answer", ipn.status === 200 && (await ipn.json()).orderTrackingId === "pp-9" && cur().paymentStatus === "PAID");
  fresh(); await card(); pp.results["pp-9"] = { status: "FAILED", amount: 2500 }; await IPN.GET(new Request("https://x/api/payments/pesapal/ipn?OrderTrackingId=pp-9")); t("IPN ROUTE: a failure is acted on only because Pesapal says so (stock returns once)", cur().paymentStatus === "FAILED" && stock() === "7/4");

  // ===== starting a payment =====
  fresh(); await mkOrder(); r = await ACT.initiateMpesaPayment(W.order.id); t("START: a fresh order gets a prompt for exactly its total; PENDING with the checkout id; stock untouched", r.success === true && stk.calls[0].amount === 2500 && stk.calls[0].accountReference === cur().orderNumber && cur().paymentStatus === "PENDING" && cur().mpesaCheckoutRequestId === "ws_CO_1" && stock() === "5/3");
  r = await ACT.initiateMpesaPayment(W.order.id); t("START: tapping 'pay' again right away sends NO second prompt (it would overwrite the first one's tracking id and lose its payment)", /just started/.test(r.error) && stk.calls.length === 1 && cur().mpesaCheckoutRequestId === "ws_CO_1");
  stk.results["ws_CO_1"] = { code: "0" }; cur().updatedAt = new Date(Date.now() - 5 * 60000); r = await ACT.initiateMpesaPayment(W.order.id); t("START: if the first prompt actually succeeded, the check before sending another finds it and says 'paid' — no double charge", /just been paid/.test(r.error) && cur().paymentStatus === "PAID" && stk.calls.length === 1);
  fresh(); await pending(); cur().updatedAt = new Date(Date.now() - 5 * 60000); r = await ACT.initiateMpesaPayment(W.order.id); t("START: a prompt that expired unanswered minutes ago can be replaced by a new one", r.success === true && stk.calls.length === 1);
  fresh(); await mkOrder({ status: "CANCELLED" }); r = await ACT.initiateMpesaPayment(W.order.id); t("START: a cancelled order can't be paid (either method)", /cancelled/.test(r.error) && stk.calls.length === 0 && /cancelled/.test((await ACT.createPesapalOrder(W.order.id) as any).error));
  fresh(); await mkOrder({ paymentStatus: "PAID" }); t("START: an already-paid order can't be paid again", /already paid/.test((await ACT.initiateMpesaPayment(W.order.id) as any).error));
  fresh(); await mkOrder(); session = { user: { id: "someone-else", role: "MEMBER" } }; t("START / STATUS: someone else's order is 'not found' for every action, and nothing is sent", (await ACT.initiateMpesaPayment(W.order.id) as any).error === "Order not found." && (await ACT.createPesapalOrder(W.order.id) as any).error === "Order not found." && (await ACT.getOrderPaymentStatus(W.order.id) as any).error === "Order not found." && stk.calls.length === 0 && pp.calls.length === 0);
  fresh(); await mkOrder(); stk.fail = true; { const q2 = console.error; console.error = () => {}; r = await ACT.initiateMpesaPayment(W.order.id); console.error = q2; }
  t("START FAILS (Safaricom unreachable) on a fresh order: FAILED with its stock RELEASED (5→7, 3→4) — a failed order holds nothing", !!r.error && cur().paymentStatus === "FAILED" && stock() === "7/4");
  stk.fail = false; r = await ACT.initiateMpesaPayment(W.order.id); t("RETRY after that: the stock is TAKEN AGAIN (back to 5/3) before the prompt — so the order that is then paid really holds its goods (the old code allowed an oversell here)", r.success === true && stock() === "5/3" && cur().paymentStatus === "PENDING");
  fresh(); await mkOrder({ paymentStatus: "FAILED" }); W.A.inventory = 1; W.B.inventory = 4; r = await ACT.initiateMpesaPayment(W.order.id);
  t("RETRY when an item has sold out meanwhile: refused naming the item, NOTHING taken (the other line isn't left half-taken), still FAILED, no prompt sent", /"Polo" has sold out/.test(r.error) && W.A.inventory === 1 && W.B.inventory === 4 && cur().paymentStatus === "FAILED" && stk.calls.length === 0);
  fresh(); await mkOrder({ paymentStatus: "FAILED" }); W.A.inventory = 7; W.B.inventory = 4; stk.fail = true; { const q3 = console.error; console.error = () => {}; r = await ACT.initiateMpesaPayment(W.order.id); console.error = q3; } stk.fail = false;
  t("RETRY whose prompt then fails to send: the re-taken stock is released again (net nothing — 7/4)", !!r.error && stock() === "7/4" && cur().paymentStatus === "FAILED");
  fresh(); await mkOrder(); r = await ACT.createPesapalOrder(W.order.id); t("START (card): a Pesapal order for exactly the total, returning to this order's page; PENDING (CARD) with the tracking id; stock untouched", !!r.url && pp.calls[0].amount === 2500 && pp.calls[0].callbackUrl === `https://visittaita.co.ke/shop/orders/${W.order.id}` && cur().paymentMethod === "CARD" && cur().pesapalOrderTrackingId === "pp-1" && stock() === "5/3");
  r = await ACT.createPesapalOrder(W.order.id); t("START (card): a second tap right away is refused too", /just started/.test(r.error) && pp.calls.length === 1);
  fresh(); await mkOrder({ paymentStatus: "FAILED" }); W.A.inventory = 7; W.B.inventory = 4; pp.fail = true; r = await ACT.createPesapalOrder(W.order.id); pp.fail = false; t("START (card) failing on a retry: the stock taken for the retry is given back", !!r.error && stock() === "7/4" && cur().paymentStatus === "FAILED");
  { const keep = process.env.NEXT_PUBLIC_APP_URL; delete process.env.NEXT_PUBLIC_APP_URL; fresh(); await mkOrder({ paymentStatus: "FAILED" }); W.A.inventory = 7; W.B.inventory = 4; r = await ACT.createPesapalOrder(W.order.id); process.env.NEXT_PUBLIC_APP_URL = keep; t("START (card) with the site address missing: says so BEFORE taking any stock", /not fully configured/.test(r.error) && stock() === "7/4"); }
  fresh(); await pending(); stk.results["ws_CO_1"] = { code: "0" }; r = await ACT.getOrderPaymentStatus(W.order.id); t("STATUS (the buyer's page poll): asks the provider, finds it paid, says PAID — a missed callback can't leave the buyer waiting", r.status === "PAID" && cur().paymentStatus === "PAID");
  fresh(); await pending(); r = await ACT.getOrderPaymentStatus(W.order.id); t("STATUS: still waiting -> PENDING", r.status === "PENDING");

  // ===== exposure =====
  const src = fs.readFileSync("lib/actions/payments.ts", "utf8"); const exported = [...src.matchAll(/^export\s+async\s+function\s+(\w+)/gm)].map((m) => m[1]).sort().join();
  t("🔒 PUBLIC ENDPOINTS: the payments 'use server' file exports ONLY what a buyer legitimately does (start M-Pesa, start card, check status) — 'restock this order' and 'sync this order/tracking id' are no longer callable from a browser", exported === "createPesapalOrder,getOrderPaymentStatus,initiateMpesaPayment" && !/restockOrderItems|syncMpesaOrderStatus|syncPesapalOrderStatus/.test(src) && !/^export\s+(?!async function|type )/m.test(src));
  t("the settling code lives in a normal module (no 'use server' directive), and the callback + IPN routes + order page use it", /^\s*["']use server["']/m.test(src) && !/^\s*["']use server["']/m.test(fs.readFileSync("lib/shop-payments.ts", "utf8")) && /handleShopMpesaCallback/.test(fs.readFileSync("app/api/payments/mpesa/callback/route.ts", "utf8")) && /handleShopPesapalIpn/.test(fs.readFileSync("app/api/payments/pesapal/ipn/route.ts", "utf8")) && /confirmShopPesapal/.test(fs.readFileSync("app/shop/orders/[id]/page.tsx", "utf8")));
  { const bad: string[] = []; let checked = 0; for (const f of fs.readdirSync("lib/actions").filter((x) => x.endsWith(".ts"))) { const s2 = fs.readFileSync(`lib/actions/${f}`, "utf8"); if (!/^\s*(\/\/.*\n|\/\*[\s\S]*?\*\/\s*)*["']use server["']/.test(s2)) continue; checked++; for (const m of s2.matchAll(/^export\s+(?!async\s+function|type\s|interface\s)(\w+)\s+(\w+)/gm)) bad.push(`${f}: export ${m[1]} ${m[2]}`); }
    t(`SERVER ACTIONS (the build rule): all ${checked} "use server" files export only async functions and types — Next.js refuses to compile otherwise${bad.length ? " — VIOLATIONS: " + bad.join("; ") : ""}`, checked >= 20 && bad.length === 0); }
  { const bk = fs.readFileSync("lib/actions/bookings.ts", "utf8"); const bp = fs.readFileSync("lib/booking-payments.ts", "utf8"); t("BOOKINGS build fix: cleanPhone lives in booking-payments.ts, not in the server-actions file", !/export function cleanPhone/.test(bk) && /export function cleanPhone/.test(bp) && /import \{ cleanPhone/.test(bk)); }

  // ===== PROPERTY: stock is never created or lost =====
  { let seed = 20261007; const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n); let violations = 0, steps = 0, scenarios = 0; const q4 = console.error; console.error = () => {};
    for (let sc = 0; sc < 120; sc++) {
      fresh(); const orders: any[] = []; for (let k = 0; k < 3; k++) orders.push(await mkOrder({}, 1 + rnd(2))); W.A.inventory = 6; W.B.inventory = 6;
      const total = (p: any) => p.inventory + T.orderItem.filter((i: any) => i.productId === p.id && row("order", i.orderId).paymentStatus !== "FAILED").reduce((a: number, i: any) => a + i.quantity, 0);
      const T0 = { A: total(W.A), B: total(W.B) }; scenarios++;
      for (let step = 0; step < 14; step++) {
        const ord = orders[rnd(3)]; const op = rnd(8); steps++; const idOf = () => row("order", ord.id).mpesaCheckoutRequestId; const run: Promise<any>[] = [];
        if (op === 0) run.push(ACT.initiateMpesaPayment(ord.id));
        else if (op === 1) { const id = idOf(); if (id) { stk.results[id] = { code: "0" }; run.push(SP.handleShopMpesaCallback(cbBody(id, 0, 2500) as any)); } }
        else if (op === 2) { const id = idOf(); if (id) { stk.results[id] = { code: "2001", desc: "wrong PIN" }; run.push(SP.handleShopMpesaCallback(cbBody(id, 2001) as any)); } }
        else if (op === 3) { const id = idOf(); if (id) { delete stk.results[id]; run.push(SP.handleShopMpesaCallback(cbBody(id, 1032) as any)); } }
        else if (op === 4) run.push(ACT.getOrderPaymentStatus(ord.id));
        else if (op === 5) { stk.fail = true; run.push(ACT.initiateMpesaPayment(ord.id)); }
        else if (op === 6) { if (idOf()) for (let d = 0; d < 3; d++) run.push(SP.confirmShopMpesa(ord.id)); }
        else { row("order", ord.id).updatedAt = new Date(Date.now() - 5 * 60000); run.push(ACT.initiateMpesaPayment(ord.id)); }
        await Promise.all(run.map((p) => p.catch(() => null))); stk.fail = false;
        if (total(W.A) !== T0.A || total(W.B) !== T0.B || W.A.inventory < 0 || W.B.inventory < 0) violations++;
      }
    } console.error = q4;
    t(`PROPERTY — STOCK CONSERVATION: ${scenarios} random scenarios × 14 random steps (${steps} in all: payment starts, genuine successes and failures, forged claims, duplicate and concurrent callbacks, polls, failed prompts, retries) — at every step inventory + goods held by non-failed orders equals the starting total and never goes negative (violations: ${violations})`, violations === 0 && steps >= 1600); }

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} SHOP PAYMENT SECURITY CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
