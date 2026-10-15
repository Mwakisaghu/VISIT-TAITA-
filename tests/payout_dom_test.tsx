import React from "react"; (globalThis as any).React = React;
const { JSDOM } = require("jsdom");
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: "http://localhost/partner/payouts", pretendToBeVisual: true }); const w = dom.window as any;
Object.assign(globalThis, { self: w, window: w, document: w.document, HTMLElement: w.HTMLElement, Node: w.Node, Event: w.Event, HTMLInputElement: w.HTMLInputElement });
Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true, writable: true }); // Node 20 has no global navigator (21+ does); React reads it as it loads
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let refreshes = 0; const calls: any[] = []; const queue: Record<string, any[]> = {};
const Module = require("module"); const origLoad = Module._load;
Module._load = function (r: string, ...x: any[]) {
  if (r === "next/navigation") return { useRouter: () => ({ push() {}, refresh: () => { refreshes++; } }) };
  if (r === "@/lib/actions/payouts") return {
    savePayoutPhone: async (v: string) => { calls.push(["phone", v]); return queue.phone?.shift() ?? { ok: true, message: "Saved. Your payouts will be sent to 2547••••6789." }; },
    savePayoutSettingsAction: async (c: string, h: string) => { calls.push(["settings", c, h]); return queue.settings?.shift() ?? { ok: true, message: "Saved." }; },
    preparePayouts: async (id: string | null) => { calls.push(["prepare", id]); return queue.prepare?.shift() ?? { ok: true, message: "Prepared 1 payout (KES 9,000 in all)." }; },
    recordPayoutAction: async (id: string, o: string, ref: string, note: string) => { calls.push(["record", id, o, ref, note]); return queue.record?.shift() ?? { ok: true, message: "Marked as sent. The host has been emailed." }; },
  };
  return origLoad.call(this, r, ...x);
};
// react-dom must load AFTER the fake browser (jsdom) exists, or it decides there is no DOM and ignores real input events (React 19).
const { createRoot } = require("react-dom/client"); const { act } = require("react"); // (react-dom/test-utils was removed in React 19)
const flush = () => act(async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 2)); }); // several turns: an action resolving, then React re-rendering, takes more than one
const q = (s: string) => w.document.querySelector(s) as any; const qa = (s: string) => [...w.document.querySelectorAll(s)] as any[]; const text = () => w.document.body.textContent ?? "";
const btn = (t: string) => qa("button").find((b: any) => (b.textContent ?? "").trim().startsWith(t));
const click = async (el: any) => { await act(async () => { el.click(); }); await flush(); };
const setVal = async (el: any, v: string) => { await act(async () => { Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, "value")!.set!.call(el, v); el.dispatchEvent(new w.Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true })); }); };
const submit = async (form: any) => { await act(async () => { form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); }); await flush(); };
let root: any; const mount = async (el: any) => { if (root) root.unmount(); w.document.body.innerHTML = '<div id="root"></div>'; root = createRoot(q("#root")); await act(async () => { root.render(el); }); await flush(); };
const reset = () => { calls.length = 0; refreshes = 0; for (const k of Object.keys(queue)) delete queue[k]; };

async function main() {
  const PF = (await import("@/components/partners/PayoutPhoneForm")).default as any; const AF = await import("@/components/admin/PayoutAdminForms");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);

  // ===== the host's number form =====
  reset(); await mount(<PF maskedCurrent={null} />);
  t("NUMBER FORM (none set): a clear warning that they can't be paid until they set one, a labelled phone box, a 'Save number' button", /haven't set a payout number yet/.test(text()) && /we can't pay you/.test(text()) && /Your M-Pesa number/.test(text()) && q('input[type="tel"]').required && /Save number/.test(btn("Save").textContent));
  await setVal(q('input[type="tel"]'), "0733 456 789"); queue.phone = [{ ok: true, message: "Saved. Your payouts will be sent to 2547••••6789." }]; await submit(q("form"));
  t("NUMBER FORM: submitting sends exactly what was typed, shows the confirmation (masked), clears the box and refreshes the page", JSON.stringify(calls) === '[["phone","0733 456 789"]]' && /2547••••6789/.test(q('[role="status"]').textContent) && q('input[type="tel"]').value === "" && refreshes === 1);
  reset(); await setVal(q('input[type="tel"]'), "0612345678"); queue.phone = [{ ok: false, error: "That isn't a Safaricom number we can pay by M-Pesa." }]; await submit(q("form"));
  t("NUMBER FORM: a refusal is shown in an alert, the typed value is kept for correction, nothing refreshes", /isn't a Safaricom number/.test(q('[role="alert"]').textContent) && q('input[type="tel"]').value === "0612345678" && refreshes === 0);
  await mount(<PF maskedCurrent="2547••••6789" />);
  t("NUMBER FORM (set): shows only the MASKED number, offers 'Change it to' / 'Change number', and no warning", /Payouts are sent to/.test(text()) && /2547••••6789/.test(text()) && !/haven't set/.test(text()) && /Change number/.test(btn("Change").textContent) && !/\b254\d{9}\b/.test(w.document.body.innerHTML));
  reset(); await mount(<PF maskedCurrent={null} />); await setVal(q('input[type="tel"]'), "0711111111"); let release: any; queue.phone = [new Promise((r) => { release = r; }) as any]; await act(async () => { q("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); });
  t("NUMBER FORM: while saving, the button says 'Saving…' and is disabled (no double submit)", /Saving…/.test(btn("Saving")?.textContent ?? "") && btn("Saving").disabled === true); await act(async () => { release({ ok: true, message: "Saved." }); }); await flush();

  // ===== settings =====
  reset(); await mount(<AF.PayoutSettingsForm commissionPercent={10} holdDays={2} />);
  t("SETTINGS FORM: shows the current values in labelled boxes and explains that a change applies to payouts prepared from now on", q('[aria-label="Commission percent"]').value === "10" && q('[aria-label="Holding days"]').value === "2" && /prepared from now on/.test(text()) && /keep the rate they were prepared with/.test(text()));
  await setVal(q('[aria-label="Commission percent"]'), "12"); await setVal(q('[aria-label="Holding days"]'), "4"); queue.settings = [{ ok: true, message: "Saved: 12% commission, earnings held 4 days." }]; await submit(q("form"));
  t("SETTINGS FORM: submitting sends the typed values and shows the confirmation", JSON.stringify(calls) === '[["settings","12","4"]]' && /12% commission/.test(q('[role="status"]').textContent));
  reset(); queue.settings = [{ ok: false, error: "The commission must be a whole number between 0% and 50%." }]; await submit(q("form")); t("SETTINGS FORM: a refusal is shown", /between 0% and 50%/.test(q('[role="alert"]').textContent));

  // ===== prepare =====
  reset(); await mount(<AF.PrepareButton hostId="h1" label="Prepare KES 9,000" />); await click(btn("Prepare KES 9,000"));
  t("PREPARE BUTTON: clicking prepares THAT host (by id), shows the result, and refreshes", JSON.stringify(calls) === '[["prepare","h1"]]' && /Prepared 1 payout/.test(q('[role="status"]').textContent) && refreshes === 1);
  reset(); await mount(<AF.PrepareButton hostId={null} label="Prepare all (KES 17,100)" />); queue.prepare = [{ ok: true, message: "Prepared 2 payouts (KES 17,100 in all). Skipped: No Number Host — they haven't registered a payout number." }]; await click(btn("Prepare all"));
  t("PREPARE ALL: sends no host id (= everyone) and shows who was skipped and why", JSON.stringify(calls) === '[["prepare",null]]' && /Skipped: No Number Host/.test(q('[role="status"]').textContent));
  reset(); queue.prepare = [{ ok: false, error: "Admin access required." }]; await click(btn("Prepare all")); t("PREPARE: a refusal is shown and nothing refreshes", /Admin access required/.test(q('[role="alert"]').textContent) && refreshes === 0);

  // ===== recording =====
  reset(); await mount(<AF.RecordPayoutForm payoutId="p1" />);
  t("RECORD FORM: a labelled receipt box, 'Mark as sent', and a collapsed 'I couldn't send it…' (aria-expanded=false); no reason box yet", !!q('[aria-label="M-Pesa receipt"]') && !!btn("Mark as sent") && btn("I couldn't send it").getAttribute("aria-expanded") === "false" && !q('[aria-label="Why it wasn\'t sent"]'));
  await setVal(q('[aria-label="M-Pesa receipt"]'), "QGH7ABC123"); await click(btn("Mark as sent"));
  t("RECORD FORM: 'Mark as sent' sends that payout, the SENT outcome and the typed receipt; success says the host was emailed and the page refreshes", JSON.stringify(calls) === '[["record","p1","SENT","QGH7ABC123",""]]' && /host has been emailed/.test(q('[role="status"]').textContent) && refreshes === 1);
  reset(); queue.record = [{ ok: false, error: "Enter the M-Pesa receipt of the payment you sent (letters and numbers, 4–40 characters)." }]; await click(btn("Mark as sent")); t("RECORD FORM: a missing/invalid receipt is refused with the reason shown", /Enter the M-Pesa receipt/.test(q('[role="alert"]').textContent) && refreshes === 0);
  reset(); await click(btn("I couldn't send it")); t("RECORD FORM: 'I couldn't send it…' opens a reason box and says the bookings go back to ready for the next payout", btn("I couldn't send it").getAttribute("aria-expanded") === "true" && !!q('[aria-label="Why it wasn\'t sent"]') && /go back to .ready./.test(text()) && /next payout/.test(text()));
  await setVal(q('[aria-label="Why it wasn\'t sent"]'), "Number isn't registered for M-Pesa"); queue.record = [{ ok: true, message: "Cancelled. Its bookings are free to go into the next payout." }]; await click(btn("Cancel this payout"));
  t("RECORD FORM: 'Cancel this payout' sends the CANCEL outcome with the reason and NO receipt", JSON.stringify(calls) === '[["record","p1","CANCEL","","Number isn\'t registered for M-Pesa"]]' && /free to go into the next payout/.test(q('[role="status"]').textContent));
  reset(); await mount(<AF.RecordPayoutForm payoutId="p2" />); let rel2: any; queue.record = [new Promise((r) => { rel2 = r; }) as any]; await act(async () => { btn("Mark as sent").click(); }); t("RECORD FORM: while recording, 'Mark as sent' is disabled (no double click)", btn("Mark as sent").disabled === true); await act(async () => { rel2({ ok: true, message: "ok" }); }); await flush();

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} PAYOUT FORM (BROWSER) CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
