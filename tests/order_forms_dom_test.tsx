import React from "react"; (globalThis as any).React = React;
const { JSDOM } = require("jsdom"); const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: "https://visittaita.example/admin/shop/orders", pretendToBeVisual: true }); const w = dom.window as any;
Object.assign(globalThis, { window: w, document: w.document, HTMLElement: w.HTMLElement, Node: w.Node, Event: w.Event }); Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true, writable: true }); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const Module = require("module"); const origLoad = Module._load; const calls: any[] = []; let refreshes = 0; let next: () => Promise<any> = async () => ({ ok: true, message: "Done." }); let gate: Promise<void> | null = null;
const act0 = async (name: string, args: any[]) => { calls.push([name, ...args]); if (gate) await gate; return next(); };
Module._load = function (r: string, ...x: any[]) {
  if (r === "next/navigation") return { useRouter: () => ({ refresh: () => { refreshes++; }, push() {} }) };
  if (r === "@/lib/actions/orders-admin") return { adminCancelOrder: (...a: any[]) => act0("cancel", a), adminProcessOrderRefund: (...a: any[]) => act0("refund", a), adminSetOrderStatus: (...a: any[]) => act0("status", a) };
  return origLoad.call(this, r, ...x);
};
const { createRoot } = require("react-dom/client"); const { act } = require("react");
let root: any; const unmount = async () => { if (root) { await act(async () => root.unmount()); root = null; } };
const mount = async (el: any) => { await unmount(); w.document.body.innerHTML = '<div id="root"></div>'; root = createRoot(w.document.getElementById("root")); await act(async () => root.render(el)); };
const $ = (s: string) => w.document.querySelector(s) as any; const $$ = (s: string) => Array.from(w.document.querySelectorAll(s)) as any[];
const typeInto = async (el: any, v: string) => { const set = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, "value")!.set!; set.call(el, v); await act(async () => { el.dispatchEvent(new w.Event("input", { bubbles: true })); }); };
const click = async (el: any) => { await act(async () => { el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true })); }); };
const submit = async () => { await act(async () => { $("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); }); };
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const reset = () => { calls.length = 0; refreshes = 0; next = async () => ({ ok: true, message: "Done." }); gate = null; };
async function main() {
  const F = await import("@/components/admin/OrderCancelForms"); const Sel = (await import("@/components/admin/OrderStatusSelect")).default as any;
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const cancelForm = (o: any = {}) => React.createElement(F.CancelOrderForm, { orderId: "o1", paid: 2500, ceiling: 2500, holdsStock: true, fulfilled: false, inFlight: false, ...o });
  const reason = () => $('input[aria-label="Reason for cancelling"]'); const amount = () => $('input[aria-label="Refund in shillings"]'); const boxes = () => $$('input[type="checkbox"]'); const btn = () => $('button[type="submit"]');
  reset(); await mount(cancelForm());
  const startDisabled = btn().disabled; await typeInto(reason(), "No longer wanted"); const stillDisabled = btn().disabled; await submit(); const notSent = calls.length === 0;
  await click(boxes()[1]); const enabled = !btn().disabled; await submit(); await flush();
  t("THE CANCEL BUTTON STAYS DISABLED UNTIL 'I understand this cannot be undone' IS TICKED (and a form submitted without it, by pressing Enter, sends nothing); then it sends exactly what was typed: the order, the reason, the refund amount (starting at what was paid) and whether to put the items back (starting ticked), and shows the message and refreshes the page", startDisabled && stillDisabled && notSent && enabled && calls.length === 1 && JSON.stringify(calls[0]) === JSON.stringify(["cancel", "o1", "No longer wanted", "2500", true]) && /Done\./.test($('[role="status"]')?.textContent ?? "") && refreshes === 1);
  reset(); await mount(cancelForm()); await typeInto(reason(), "Damaged"); await typeInto(amount(), "1000"); await click(boxes()[0]); await click(boxes()[1]); await submit(); await flush();
  t("THE ADMIN'S CHOICES ARE WHAT IS SENT: a partial refund typed in, and the stock tick switched off", JSON.stringify(calls[0]) === JSON.stringify(["cancel", "o1", "Damaged", "1000", false]) && amount().getAttribute("max") === "2500" && amount().getAttribute("min") === "0");
  reset(); await mount(cancelForm({ paid: 0, ceiling: 0 })); await typeInto(reason(), "Never paid"); await click(boxes()[1]); await submit(); await flush();
  t("WHEN NOTHING WAS PAID there is no refund box and the refund argument is null (never a number)", !amount() && /Nothing has been paid/.test(w.document.body.textContent) && JSON.stringify(calls[0]) === JSON.stringify(["cancel", "o1", "Never paid", null, true]));
  reset(); await mount(cancelForm({ holdsStock: false, paid: 0, ceiling: 0 })); await typeInto(reason(), "Already back"); const onlyOneBox = boxes().length === 1; await click(boxes()[0]); await submit(); await flush();
  t("WHEN THE STOCK IS ALREADY BACK there is no stock box, it says so, and the stock argument is false", onlyOneBox && /already back on the shelf/.test(w.document.body.textContent) && calls[0][4] === false);
  reset(); await mount(cancelForm({ fulfilled: true })); const unticked = boxes()[0].checked === false; await mount(cancelForm({ paid: 0, ceiling: 3000, inFlight: false })); const ceilingOnly = amount().getAttribute("max") === "3000" && /NOT confirmed a payment/.test(w.document.body.textContent);
  t("A FULFILLED ORDER STARTS WITH THE STOCK TICK OFF (the goods may be broken), and an unconfirmed payment shows its own warning with the order total as the limit", unticked && ceilingOnly);
  reset(); let release!: () => void; gate = new Promise<void>((r) => (release = r)); await mount(cancelForm()); await typeInto(reason(), "Double click"); await click(boxes()[1]); await submit(); await submit(); await submit(); const duringBusy = btn().disabled; const sentOnce = calls.length === 1; release(); await flush();
  t("A DOUBLE-CLICK SENDS IT ONCE: while the request is running the button is disabled and further submissions are ignored (the server would refuse a second cancel anyway)", duringBusy && sentOnce && calls.length === 1);
  reset(); next = async () => ({ ok: false, error: "This order is already cancelled." }); await mount(cancelForm()); await typeInto(reason(), "x y z"); await click(boxes()[1]); await submit(); await flush();
  t("A REFUSAL IS SHOWN, AND NOTHING REFRESHES: the server's reason appears as an alert and the page is not reloaded as if it had worked", /already cancelled/.test($('[role="alert"]')?.textContent ?? "") && refreshes === 0 && !$('[role="status"]') && !btn().disabled);
  reset(); next = async () => { throw new Error("network"); }; await mount(cancelForm()); await typeInto(reason(), "x y z"); await click(boxes()[1]); await submit(); await flush();
  t("A NETWORK FAILURE IS HANDLED: a plain 'Something went wrong' alert, the form usable again, nothing thrown at the visitor", /Something went wrong\. Please try again\./.test($('[role="alert"]')?.textContent ?? "") && !btn().disabled);
  // ===== the refund form =====
  reset(); await mount(React.createElement(F.OrderRefundForm, { refundId: "r1" })); await typeInto($('input[aria-label="M-Pesa receipt"]'), "QGH7ABCD12"); await typeInto($('input[aria-label="Note"]'), "sent from the till"); await click($$("button")[0]); await flush(); await click($$("button")[1]); await flush();
  t("THE REFUND FORM SENDS THE RIGHT OUTCOME: 'Mark as sent' sends SENT with the receipt and note, 'Mark as failed' sends FAILED, each showing the server's message and refreshing", JSON.stringify(calls[0]) === JSON.stringify(["refund", "r1", "SENT", "QGH7ABCD12", "sent from the till"]) && calls[1][2] === "FAILED" && refreshes === 2);
  // ===== the status dropdown =====
  reset(); await mount(React.createElement(Sel, { orderId: "o9", status: "PENDING" })); const select = () => $("select"); const change = async (v: string) => { await act(async () => { select().value = v; select().dispatchEvent(new w.Event("change", { bubbles: true })); }); await flush(); };
  await change("FULFILLED"); const okCall = JSON.stringify(calls[0]) === JSON.stringify(["status", "o9", "FULFILLED"]) && select().value === "FULFILLED" && !$('[role="alert"]');
  reset(); next = async () => ({ ok: false, error: "A cancelled order cannot be reopened." }); await mount(React.createElement(Sel, { orderId: "o9", status: "CONFIRMED" })); await change("PENDING");
  t("THE STATUS DROPDOWN SAVES ITS CHOICE, AND PUTS THE OLD STATUS BACK WITH THE REASON IF THE SERVER REFUSES (so the screen never shows a status the order does not have)", okCall && select().value === "CONFIRMED" && /cannot be reopened/.test($('[role="alert"]')?.textContent ?? "") && JSON.stringify(calls[0]) === JSON.stringify(["status", "o9", "PENDING"]));
  await unmount(); let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} ORDER FORMS BROWSER CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
