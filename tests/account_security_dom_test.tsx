import React from "react"; (globalThis as any).React = React;
const { JSDOM } = require("jsdom");
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: "http://localhost/", pretendToBeVisual: true }); const w = dom.window as any;
w.matchMedia = (q: string) => ({ matches: false, addEventListener() {}, removeEventListener() {} }); w.requestAnimationFrame = (f: any) => setTimeout(() => f(0), 0); w.cancelAnimationFrame = (n: any) => clearTimeout(n);
Object.assign(globalThis, { FormData: w.FormData, HTMLInputElement: w.HTMLInputElement, HTMLFormElement: w.HTMLFormElement, Element: w.Element, self: w, window: w, document: w.document, HTMLElement: w.HTMLElement, Node: w.Node, Event: w.Event, KeyboardEvent: w.KeyboardEvent, MouseEvent: w.MouseEvent, requestAnimationFrame: w.requestAnimationFrame, cancelAnimationFrame: w.cancelAnimationFrame });
Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true, writable: true }); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let refreshes = 0; const signOuts: any[] = []; const calls: { name: string[]; pw: string[][]; so: number } = { name: [], pw: [], so: 0 };
let nameReply: any = { ok: true, name: "" }; let pwReply: any = { ok: true }; let soReply: any = { ok: true }; let hold: Promise<void> | null = null;
const Module = require("module"); const origLoad = Module._load;
Module._load = function (r: string, ...x: any[]) {
  if (r === "next/navigation") return { useRouter: () => ({ push() {}, refresh() { refreshes++; } }), usePathname: () => "/account" };
  if (r === "next-auth/react") return { signOut: async (o: any) => { signOuts.push(o); } };
  if (r === "next/link") return { __esModule: true, default: ({ href, children, ...rest }: any) => React.createElement("a", { href, ...rest }, children) };
  if (r === "@/lib/actions/account-security") return {
    updateMyName: async (n: string) => { calls.name.push(n); if (hold) await hold; return typeof nameReply === "function" ? nameReply(n) : nameReply; },
    changeMyPassword: async (c: string, n: string) => { calls.pw.push([c, n]); if (hold) await hold; return pwReply; },
    signOutEverywhere: async () => { calls.so++; if (hold) await hold; return soReply; },
  };
  return origLoad.call(this, r, ...x);
};
const { createRoot } = require("react-dom/client"); const { act } = require("react");
const flush = () => act(async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 4)); });
const q = (s: string) => w.document.querySelector(s) as any; const qa = (s: string) => [...w.document.querySelectorAll(s)] as any[];
let root: any; const mount = async (el: any) => { if (root) await act(async () => root.unmount()); w.document.body.innerHTML = '<div id="root"></div>'; root = createRoot(q("#root")); await act(async () => { root.render(el); }); await flush(); };
const click = async (el: any) => { await act(async () => { el.click(); }); await flush(); };
const setVal = async (el: any, v: string) => { await act(async () => { Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, "value")!.set!.call(el, v); el.dispatchEvent(new w.Event("input", { bubbles: true })); }); };
const submit = async (form: any) => { await act(async () => { form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); }); await flush(); };
const btn = (re: RegExp) => qa("button").find((b: any) => re.test(b.textContent.trim()));
const until = async (cond: () => boolean, ms = 1500) => { const t0 = Date.now(); while (!cond() && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 10)); await flush(); }; // wait for an outcome, not for a guessed time
const reset = () => { calls.name.length = 0; calls.pw.length = 0; calls.so = 0; signOuts.length = 0; refreshes = 0; hold = null; nameReply = { ok: true, name: "" }; pwReply = { ok: true }; soReply = { ok: true }; };
async function main() {
  const { LocaleProvider } = await import("@/lib/i18n/client"); const Name = (await import("@/components/account-hub/EditNameForm")).default as any; const Pw = (await import("@/components/account-hub/ChangePasswordForm")).default as any; const SO = (await import("@/components/account-hub/SignOutEverywhere")).default as any;
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const inLang = (loc: string, el: any) => <LocaleProvider locale={loc as any}>{el}</LocaleProvider>;
  // ===== the name =====
  reset(); await mount(inLang("en", <Name name="Neema Mwadime" />));
  t("NAME (closed): shows the name and an Edit button named 'Edit your name' (so a screen reader says what it edits); no form yet", /Neema Mwadime/.test(q("#root").textContent) && !q("form") && btn(/^Edit$/)?.getAttribute("aria-label") === "Edit your name");
  await click(btn(/^Edit$/)); const nameIn = q("#account-name");
  t("NAME (open): a form with a real label ('Your name'), the input holding the current name, focus moved into it, the browser's name autofill allowed, Save and Cancel", !!q("form") && q('label[for="account-name"]')?.textContent === "Your name" && nameIn.value === "Neema Mwadime" && w.document.activeElement === nameIn && nameIn.getAttribute("autocomplete") === "name" && !!btn(/^Save$/) && !!btn(/^Cancel$/));
  await setVal(nameIn, "   "); await submit(q("form"));
  t("NAME (checked in the browser first): an empty or invalid name is explained at once, announced as an alert, tied to the field, and never sent to the server", /Use at least 2 characters\./.test(q('[role="alert"]')?.textContent ?? "") && nameIn.getAttribute("aria-invalid") === "true" && !!q("#" + nameIn.getAttribute("aria-describedby")) && calls.name.length === 0);
  await setVal(nameIn, "a@b.co"); await submit(q("form")); const inv = q('[role="alert"]')?.textContent ?? ""; await setVal(nameIn, "x".repeat(90)); await submit(q("form"));
  t("NAME (the other refusals): characters we cannot accept, and too long, each have their own plain message; still nothing sent", /cannot accept/.test(inv) && /Use at most 80 characters\./.test(q('[role="alert"]')?.textContent ?? "") && calls.name.length === 0);
  await setVal(nameIn, "Neema Mwadime"); await submit(q("form"));
  t("NAME (unchanged): saving the same name just closes the form, with no server call", !q("form") && calls.name.length === 0);
  await click(btn(/^Edit$/)); nameReply = (n: string) => ({ ok: true, name: n }); await setVal(q("#account-name"), "  Neema   Wanjiru  Mwadime "); await submit(q("form"));
  t("NAME (saved): the TIDIED name is what is sent; the form closes; the new name shows with a polite 'Name saved.' status; the page is refreshed; focus returns to the Edit button", calls.name.join("|") === "Neema Wanjiru Mwadime" && !q("form") && /Neema Wanjiru Mwadime/.test(q("#root").textContent) && q('[role="status"]')?.textContent === "Name saved." && refreshes === 1 && w.document.activeElement === btn(/^Edit$/));
  reset(); await click(btn(/^Edit$/)); nameReply = { ok: false, code: "too_many" }; await setVal(q("#account-name"), "Another Name"); await submit(q("form"));
  const stay = !!q("form") && q("#account-name").value === "Another Name"; nameReply = { ok: false, code: "failed" }; await submit(q("form"));
  t("NAME (the server says no): a limit or a failure keeps the form open with what the person typed, and says so plainly; the page is not refreshed", stay && /Something went wrong/.test(q('[role="alert"]')?.textContent ?? "") && refreshes === 0);
  await click(btn(/^Cancel$/)); t("NAME (cancel): closes without changing anything", !q("form") && /Neema Wanjiru Mwadime|Neema Mwadime/.test(q("#root").textContent));
  reset(); await mount(inLang("sw", <Name name="Neema Mwadime" />)); await click(btn(/^Hariri$/)); await setVal(q("#account-name"), "A"); await submit(q("form"));
  t("NAME (Kiswahili): the button, the label, Save and the error are all in Kiswahili", q('label[for="account-name"]')?.textContent === "Jina lako" && !!btn(/^Hifadhi$/) && !!btn(/^Ghairi$/) && /Tumia angalau herufi 2\./.test(q('[role="alert"]')?.textContent ?? ""));
  // ===== the password =====
  reset(); await mount(inLang("en", <Pw summary="Last changed on 3 September 2026" name="Neema Mwadime" email="neema.mwadime@example.com" />)); const tog = btn(/^Change password$/);
  t("PASSWORD (closed): says when it was last changed and offers one button, which is collapsed and says what it opens", /Last changed on 3 September 2026/.test(q("#root").textContent) && tog.getAttribute("aria-expanded") === "false" && tog.getAttribute("aria-controls") === "change-password-panel" && !q("form"));
  await click(tog); const f = q("form"); const cur = q("#pw-current"), nxt = q("#pw-next"), agn = q("#pw-again");
  t("PASSWORD (open): three labelled fields (current, new, confirm) that password managers understand (current-password, new-password, new-password), pasting is not blocked, focus lands in the first, the rule is written under the new one and tied to it, and a forgot-your-password way out is offered", q("#change-password-panel") && tog.getAttribute("aria-expanded") === "true" && [cur, nxt, agn].every((i) => i.type === "password") && cur.getAttribute("autocomplete") === "current-password" && nxt.getAttribute("autocomplete") === "new-password" && agn.getAttribute("autocomplete") === "new-password" && q('label[for="pw-current"]').textContent === "Current password" && q('label[for="pw-next"]').textContent === "New password" && q('label[for="pw-again"]').textContent === "Confirm new password" && w.document.activeElement === cur && /At least 10 characters/.test(q("#pw-next-hint").textContent) && nxt.getAttribute("aria-describedby").includes("pw-next-hint") && !f.querySelector("[onpaste],[data-no-paste]") && q('a[href="/forgot-password"]'));
  await click(q('input[type="checkbox"]')); const shown = [cur, nxt, agn].every((i) => i.type === "text"); await click(q('input[type="checkbox"]'));
  t("PASSWORD (show passwords): one checkbox shows all three fields as text (helpful on a phone) and hides them again", shown && [cur, nxt, agn].every((i) => i.type === "password"));
  await submit(f); const e1 = q('[role="alert"]');
  t("PASSWORD (missing current): says 'Enter your current password.' on that field, which is marked invalid; nothing is sent", /Enter your current password\./.test(e1?.textContent ?? "") && cur.getAttribute("aria-invalid") === "true" && calls.pw.length === 0);
  await setVal(cur, "wide-sky-red-earth-lion"); await setVal(nxt, "wide-sky-red-earth-lion"); await submit(f);
  const e2 = q('[role="alert"]')?.textContent ?? ""; await setVal(nxt, "password1234"); await submit(f); const e3 = q('[role="alert"]')?.textContent ?? ""; await setVal(nxt, "neema-forever-1"); await submit(f); const e4 = q('[role="alert"]')?.textContent ?? ""; await setVal(nxt, "aaaaabbbbb"); await submit(f); const e5 = q('[role="alert"]')?.textContent ?? "";
  t("PASSWORD (checked in the browser first): the same as the current one, too easy to guess, containing the person's own name, and too repetitive each get their own plain message on the new-password field; none is sent", /different password from your current/.test(e2) && /too easy to guess/.test(e3) && /should not contain your name or email/.test(e4) && /more different characters/.test(e5) && nxt.getAttribute("aria-invalid") === "true" && calls.pw.length === 0);
  await setVal(nxt, "ngangao-mist-at-dawn-1800"); await setVal(agn, "ngangao-mist-at-dawn-1801"); await submit(f);
  t("PASSWORD (the two new ones differ): said on the confirm field; nothing sent", /not the same/.test(q('[role="alert"]')?.textContent ?? "") && agn.getAttribute("aria-invalid") === "true" && calls.pw.length === 0);
  await setVal(agn, "ngangao-mist-at-dawn-1800"); pwReply = { ok: false, code: "wrong_password" }; await submit(f);
  t("PASSWORD (sent): exactly the current and the new password go to the server; a wrong current password is said on the CURRENT field, in plain words, and the form stays open", calls.pw.length === 1 && calls.pw[0].join("|") === "wide-sky-red-earth-lion|ngangao-mist-at-dawn-1800" && /isn't your current password/.test(q('[role="alert"]')?.textContent ?? "") && cur.getAttribute("aria-invalid") === "true" && signOuts.length === 0);
  pwReply = { ok: false, code: "weak", policy: { ok: false, reason: "repetitive", detail: "variety", message: "x" } }; await submit(f); const sv = q('[role="alert"]')?.textContent ?? ""; pwReply = { ok: false, code: "too_many" }; await submit(f); const tm = q('[role="alert"]')?.textContent ?? "";
  t("PASSWORD (the server's own refusals): a weak password reported by the server is shown with the right message for its reason; too many tries is said plainly; still no sign-out", /more different characters/.test(sv) && /Too many tries/.test(tm) && signOuts.length === 0);
  pwReply = { ok: true }; let release!: () => void; hold = new Promise<void>((r) => { release = r; }); await submit(f); const busy = btn(/^Saving…$/); const busyLocked = busy?.disabled === true; release(); await until(() => signOuts.length > 0); // the server answer is held open so the busy state can be seen, then released
  t("PASSWORD (success): while it works the button says 'Saving…' and is disabled; then the person is told they are being signed out everywhere, and signed out with the sign-in page as the place to return to (which says the password was changed)", !!busy && busyLocked && /signed out everywhere\. Please sign in with your new password/.test(q("#root").textContent) && signOuts.length === 1 && signOuts[0].callbackUrl === "/login?reset=1");
  reset(); await mount(inLang("de", <Pw summary="x" name="Neema Mwadime" email="n@x.co" />)); await click(btn(/^Passwort ändern$/)); await setVal(q("#pw-current"), "abc"); await setVal(q("#pw-next"), "password1234"); await submit(q("form"));
  t("PASSWORD (Deutsch): labels, hint, buttons and the refusal are in German, informal 'du'", q('label[for="pw-current"]').textContent === "Aktuelles Passwort" && /Mindestens 10 Zeichen/.test(q("#pw-next-hint").textContent) && !!btn(/^Neues Passwort speichern$/) && /zu leicht zu erraten/.test(q('[role="alert"]')?.textContent ?? "") && /Aktuelles Passwort vergessen/.test(q("form").textContent));
  reset(); await mount(inLang("sw", <Pw summary="x" name="Neema Mwadime" email="n@x.co" />)); await click(btn(/^Badilisha nenosiri$/)); await setVal(q("#pw-current"), "wide-sky-red-earth-lion"); await setVal(q("#pw-next"), "ngangao-mist-at-dawn-1800"); await setVal(q("#pw-again"), "ngangao-mist-at-dawn-1800"); await submit(q("form")); await until(() => signOuts.length > 0);
  t("PASSWORD (Kiswahili): the sign-out after success returns to the Kiswahili sign-in page", signOuts[0]?.callbackUrl === "/sw/login?reset=1" && /Nenosiri limebadilishwa/.test(q("#root").textContent));
  reset(); await mount(inLang("en", <Pw summary="x" name="N" email="n@x.co" />)); await click(btn(/^Change password$/)); await setVal(q("#pw-current"), "abc"); await click(btn(/^Cancel$/));
  t("PASSWORD (cancel): collapses the form, forgets what was typed, and returns focus to the button that opened it", !q("form") && w.document.activeElement === btn(/^Change password$/) && (await (async () => { await click(btn(/^Change password$/)); return q("#pw-current").value === ""; })()));
  // ===== sign out everywhere =====
  reset(); await mount(inLang("en", <SO summary="Lost a phone or used a shared computer? Sign out everywhere at once." />));
  t("SIGN OUT EVERYWHERE (closed): explains when to use it and offers one button; nothing is sent by merely loading", /Lost a phone/.test(q("#root").textContent) && !!btn(/^Sign out everywhere$/) && calls.so === 0 && signOuts.length === 0);
  await click(btn(/^Sign out everywhere$/));
  t("SIGN OUT EVERYWHERE (asks first): one click only asks ('including this one? Other devices are signed out within a few minutes'), with a clear Yes and a Cancel; nothing has happened yet", /including this one\? Other devices are signed out within a few minutes/.test(q("#root").textContent) && !!btn(/^Yes, sign out everywhere$/) && !!btn(/^Cancel$/) && calls.so === 0 && signOuts.length === 0 && !btn(/^Sign out everywhere$/));
  await click(btn(/^Cancel$/)); const back = !!btn(/^Sign out everywhere$/) && calls.so === 0;
  await click(btn(/^Sign out everywhere$/)); soReply = { ok: false, code: "too_many" }; await click(btn(/^Yes, sign out everywhere$/));
  t("SIGN OUT EVERYWHERE (cancel, and a refusal): Cancel changes nothing; if the server refuses, the person is told and is NOT signed out", back && calls.so === 1 && /Too many tries/.test(q('[role="alert"]')?.textContent ?? "") && signOuts.length === 0);
  soReply = { ok: true }; let release2!: () => void; hold = new Promise<void>((r) => { release2 = r; }); await click(btn(/^Yes, sign out everywhere$/)); const busy2 = btn(/^Signing out…$/); const busy2Locked = busy2?.disabled === true && btn(/^Cancel$/)?.disabled === true; release2(); await until(() => signOuts.length > 0); // the state was read WHILE busy: afterwards React rightly re-enables the same buttons
  t("SIGN OUT EVERYWHERE (confirmed): while it works the button says 'Signing out…' and neither it nor Cancel can be pressed; then this device is signed out too, returning to a sign-in page that says every device was signed out", !!busy2 && busy2Locked && signOuts.length === 1 && signOuts[0].callbackUrl === "/login?signedout=1" && calls.so === 2);
  reset(); await mount(inLang("fr", <SO summary="x" />)); await click(btn(/^Se déconnecter partout$/)); await click(btn(/^Oui, me déconnecter partout$/)); await until(() => signOuts.length > 0);
  t("SIGN OUT EVERYWHERE (Français): buttons in French, and the return address is the French sign-in page", signOuts[0]?.callbackUrl === "/fr/login?signedout=1");
  // ===== no element fights itself over its colour (the open states are where this hid before) =====
  const COL = /(?<![:\w-])text-(?:stone(?:\/\d+)?|parchment|rust(?:-deep)?|canopy(?:-deep)?|ochre(?:-light)?|white)(?![\w-])/g; const clash: string[] = [];
  const scan = () => qa("[class]").forEach((e: any) => { if ((String(e.getAttribute("class")).match(COL) ?? []).length > 1) clash.push(e.getAttribute("class").slice(0, 80)); });
  reset(); await mount(inLang("en", <Name name="Neema Mwadime" />)); await click(btn(/^Edit$/)); await setVal(q("#account-name"), "A"); await submit(q("form")); scan();
  await mount(inLang("en", <Pw summary="x" name="N" email="n@x.co" />)); await click(btn(/^Change password$/)); await submit(q("form")); scan();
  await mount(inLang("en", <SO summary="x" />)); await click(btn(/^Sign out everywhere$/)); scan();
  t("NO ELEMENT IN THE OPEN FORMS FIGHTS ITSELF OVER ITS TEXT COLOUR (name form with an error, password form with an error, the sign-out confirmation)" + (clash.length ? " — e.g. " + clash[0] : ""), clash.length === 0);
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} ACCOUNT SECURITY FORM CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
