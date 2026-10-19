"use client";
// Two-step sign-in, from the person's side: set it up (scan, confirm, save recovery codes), or see that it is on and make new recovery codes or turn it off.
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import { useState } from "react";
import CodeInput from "@/components/auth/CodeInput";
import PasswordField from "@/components/auth/PasswordField";
import { confirmTwoStepSetup, makeNewRecoveryCodes, startTwoStepSetup, turnOffTwoStep, type TwoStepCode, type TwoStepState } from "@/lib/actions/two-step";
import { useI18n } from "@/lib/i18n/client";

type View = "intro" | "scan" | "confirm" | "codes" | "done" | "renew" | "off";
const BTN = "flex min-h-[54px] w-full items-center justify-center rounded-full bg-rust font-body text-base font-extrabold text-white hover:bg-rust-deep disabled:opacity-60";
const GHOST = "flex min-h-[54px] w-full items-center justify-center rounded-full border-2 border-stone font-body text-base font-extrabold text-stone hover:bg-stone/5 disabled:opacity-60";
const LINKB = "inline-flex min-h-[44px] items-center font-body font-bold text-rust-deep underline underline-offset-4";
const ERR = "mb-4 rounded-lg border-[1.5px] border-[#8E2A12] bg-[#F6DDD3] p-3 font-body text-[0.94rem] font-bold text-[#8E2A12]";

export default function TwoStepPanel({ state, required, after }: { state: TwoStepState; required: boolean; after: string }) {
  const { tr } = useI18n(); const router = useRouter();
  const [view, setView] = useState<View>("intro"); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [note, setNote] = useState("");
  const [key, setKey] = useState(""); const [qr, setQr] = useState(""); const [code, setCode] = useState(""); const [codes, setCodes] = useState<string[]>([]); const [saved, setSaved] = useState(false); const [renewed, setRenewed] = useState(false); const [password, setPassword] = useState("");
  const say = (c: TwoStepCode): string => c === "wrong_code" ? tr("That code isn't right. Make sure your phone's clock is correct, then try the next code.") : c === "wrong_password" ? tr("That password isn't right.") : c === "too_many" ? tr("Too many attempts. Please wait a few minutes and try again.") : c === "not_signed_in" ? tr("Please sign in.") : c === "unavailable" ? tr("Two-step sign-in is not available right now. Please try again later.") : c === "required" ? tr("Your account needs two-step sign-in, so it can't be turned off.") : c === "already_on" ? tr("Two-step sign-in is already on.") : c === "not_started" ? tr("Please start again.") : c === "not_on" ? tr("Two-step sign-in is not on.") : tr("Something went wrong.");
  const run = async (f: () => Promise<void>) => { setBusy(true); setError(""); try { await f(); } catch { setError(tr("Something went wrong.")); } finally { setBusy(false); } };

  if (!state.available) return <p className="rounded-lg border-[1.5px] border-ochre/50 bg-ochre-light/20 p-4 font-body text-[0.95rem]">{tr("Two-step sign-in has not been switched on for this site yet.")}</p>;

  const start = () => run(async () => { const r = await startTwoStepSetup(); if (!r.ok) return setError(say(r.code)); setKey(r.key); setQr(r.qr); setCode(""); setView("scan"); });
  const confirm = (c = code) => { if (busy) return; if (c.length < 6) { setError(tr("Type all 6 digits from your app.")); return; } void run(async () => { const r = await confirmTwoStepSetup(c); if (!r.ok) { setCode(""); return setError(say(r.code)); } setCodes(r.codes); setSaved(false); setRenewed(false); setView("codes"); }); };
  // The admin gate reads the sign-in cookie, not the database, so after setup the cookie must be refreshed (asking for the session does that) or a staff member would still be held at this page.
  const finish = async () => { if (!saved) { setNote(tr("Tick the box first, to say you have saved your codes.")); return; } try { await getSession(); } catch { /* the next page load refreshes it */ } router.refresh(); if (renewed) { setView("intro"); setNote(tr("Your new recovery codes are saved.")); } else setView("done"); };
  const copyCodes = async () => { try { await navigator.clipboard.writeText(codes.join("\n")); } catch { /* the codes are on the screen */ } setNote(tr("Recovery codes copied.")); };
  const download = () => { const blob = new Blob([`${tr("Visit Taita recovery codes")}\n${tr("Each works once. Keep them safe.")}\n\n${codes.join("\n")}\n`], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "visit-taita-recovery-codes.txt"; a.click(); URL.revokeObjectURL(a.href); };
  const newCodes = () => { if (busy) return; void run(async () => { const r = await makeNewRecoveryCodes(password, code); if (!r.ok) return setError(say(r.code)); setCodes(r.codes); setSaved(false); setRenewed(true); setPassword(""); setCode(""); setView("codes"); }); };
  const off = () => { if (busy) return; void run(async () => { const r = await turnOffTwoStep(password, code); if (!r.ok) return setError(say(r.code)); setPassword(""); setCode(""); router.refresh(); setView("intro"); setNote(tr("Two-step sign-in is off.")); }); };

  const errorBox = error && <p role="alert" className={ERR}>{error}</p>;
  const noteBox = note && <p role="status" className="mb-3 font-body text-[0.9rem] font-bold text-canopy-deep">{note}</p>;
  const step = (n: number, h: string, id: string) => (<><p className="mb-2 font-body text-[0.78rem] font-extrabold uppercase tracking-[0.14em] text-rust-deep">{tr("Step {n} of 3", { n })}</p><h2 id={id} className="font-display text-[1.6rem] font-semibold leading-tight">{h}</h2></>);

  if (view === "scan") return (
    <section aria-labelledby="ts-scan"><div className="flex flex-col gap-3">{step(1, tr("Scan with your app"), "ts-scan")}
      <p className="font-body text-stone/80">{tr("In your authenticator app (Google Authenticator, Microsoft Authenticator, Authy or 1Password), add an account and scan this code.")}</p>{errorBox}
      <div role="img" aria-label={tr("QR code for your authenticator app")} className="h-[208px] w-[208px] rounded-[10px] border-[1.5px] border-stone/25 bg-white p-3" dangerouslySetInnerHTML={{ __html: qr }} />
      <details><summary className={`${LINKB} cursor-pointer`}>{tr("Can't scan? Type the key instead")}</summary><p className="mt-1 break-all rounded-lg border-[1.5px] border-stone/25 bg-[#F6F0DF] p-3 font-mono font-bold tracking-wider">{key}</p><button type="button" className={LINKB} onClick={async () => { try { await navigator.clipboard.writeText(key.replace(/\s/g, "")); } catch { /* typed by hand */ } setNote(tr("Key copied.")); }}>{tr("Copy the key")}</button></details>
      {noteBox}<button type="button" className={BTN} onClick={() => { setError(""); setNote(""); setView("confirm"); }}>{tr("I've added it")}</button></div></section>);
  if (view === "confirm") return (
    <section aria-labelledby="ts-confirm"><div className="flex flex-col gap-3">{step(2, tr("Enter the code to confirm"), "ts-confirm")}
      <p className="font-body text-stone/80">{tr("Type the 6-digit code your app shows now. This proves it's set up.")}</p>{errorBox}
      <form onSubmit={(e) => { e.preventDefault(); confirm(); }}><CodeInput id="ts-code" label={tr("6-digit code")} value={code} onChange={setCode} onComplete={confirm} invalid={!!error} autoFocus /><button type="submit" disabled={busy} className={`${BTN} mt-4`}>{tr("Confirm")}</button></form></div></section>);
  if (view === "codes") return (
    <section aria-labelledby="ts-codes"><div className="flex flex-col gap-3">{step(3, tr("Save your recovery codes"), "ts-codes")}
      <p className="font-body text-stone/80">{tr("If you lose your phone, one of these gets you back in. Each works once.")}</p>
      <p className="rounded-lg border-[1.5px] border-ochre bg-[#F4E6C2] p-3 font-body text-[0.92rem]"><strong>{tr("We show these once.")}</strong> {tr("Keep them somewhere safe, apart from your phone: a password manager, or on paper.")}</p>
      <ul aria-label={tr("Recovery codes")} className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-[10px] border-[1.5px] border-stone/25 bg-[#F6F0DF] p-4 font-mono text-[1.02rem] font-bold">{codes.map((c) => <li key={c}>{c}</li>)}</ul>
      <div className="flex flex-wrap gap-x-5"><button type="button" className={LINKB} onClick={copyCodes}>{tr("Copy")}</button><button type="button" className={LINKB} onClick={download}>{tr("Download")}</button><button type="button" className={LINKB} onClick={() => window.print()}>{tr("Print")}</button></div>{noteBox}
      <label className="flex items-start gap-3 font-body text-[0.94rem]"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 h-6 w-6 flex-none accent-rust" /><span>{tr("I've saved these codes somewhere safe.")}</span></label>
      <button type="button" aria-disabled={!saved} onClick={finish} className={`${BTN} ${saved ? "" : "opacity-50"}`}>{tr("Finish")}</button></div></section>);
  if (view === "done") return (
    <section aria-labelledby="ts-done"><p className="mb-4 inline-flex items-center gap-2 rounded-full bg-canopy px-4 py-2 font-body font-extrabold text-white">{"\u2713"} {tr("Two-step sign-in is on")}</p><h2 id="ts-done" className="font-display text-[1.6rem] font-semibold">{tr("You're protected")}</h2>
      <p className="mb-5 mt-2 font-body text-stone/80">{tr("From now on, signing in asks for your password and a code from your app.")}</p><button type="button" className={BTN} onClick={() => router.push(after)}>{tr("Continue")}</button></section>);
  if (view === "renew") return (
    <section aria-labelledby="ts-renew"><h2 id="ts-renew" className="mb-2 font-display text-[1.6rem] font-semibold">{tr("Make new recovery codes")}</h2><p className="mb-4 font-body text-stone/80">{tr("The old ones will stop working. To make sure it is you, enter your password and a code from your app (or a recovery code).")}</p>{errorBox}
      <form onSubmit={(e) => { e.preventDefault(); newCodes(); }}><PasswordField id="ts-renew-pw" label={tr("Password")} value={password} onChange={setPassword} autoComplete="current-password" /><CodeInput id="ts-renew-code" label={tr("6-digit code")} value={code} onChange={setCode} invalid={false} /><p className="mb-4 font-body text-[0.86rem] text-stone/80">{tr("A recovery code works here too.")}</p>
        <button type="submit" disabled={busy || !password || !code} className={BTN}>{tr("Make new codes")}</button><button type="button" className={`${LINKB} mt-2`} onClick={() => { setView("intro"); setError(""); }}>{tr("Cancel")}</button></form></section>);
  if (view === "off") return (
    <section aria-labelledby="ts-off"><h2 id="ts-off" className="mb-2 font-display text-[1.6rem] font-semibold">{tr("Turn off two-step sign-in")}</h2><p className="mb-4 font-body text-stone/80">{tr("To make sure it is you, enter your password and a code from your app (or a recovery code).")}</p>{errorBox}
      <form onSubmit={(e) => { e.preventDefault(); off(); }}><PasswordField id="ts-off-pw" label={tr("Password")} value={password} onChange={setPassword} autoComplete="current-password" /><CodeInput id="ts-off-code" label={tr("6-digit code")} value={code} onChange={setCode} invalid={false} /><p className="mb-4 font-body text-[0.86rem] text-stone/80">{tr("A recovery code works here too.")}</p>
        <button type="submit" disabled={busy || !password || !code} className={BTN}>{tr("Turn off")}</button><button type="button" className={`${LINKB} mt-2`} onClick={() => { setView("intro"); setError(""); }}>{tr("Cancel")}</button></form></section>);

  // intro / status
  if (!state.enabled) return (
    <section aria-labelledby="ts-intro"><h2 id="ts-intro" className="font-display text-[1.6rem] font-semibold">{tr("Add a second step to signing in")}</h2>
      {required && <p className="mb-3 mt-2 rounded-lg border-[1.5px] border-ochre bg-[#F4E6C2] p-3 font-body text-[0.94rem] font-bold">{tr("Your account needs two-step sign-in. Until it is on, you can't use the admin area.")}</p>}
      <p className="mb-2 mt-2 font-body text-stone/80">{tr("Signing in will ask for your password and a code from an app on your phone. Even if someone learns your password, they cannot get in without your phone.")}</p>
      <ol className="mb-5 list-decimal pl-5 font-body"><li>{tr("Install an authenticator app (Google Authenticator, Microsoft Authenticator, Authy or 1Password).")}</li><li>{tr("Scan one code.")}</li><li>{tr("Save your recovery codes.")}</li></ol>{noteBox}{errorBox}
      <button type="button" disabled={busy} className={BTN} onClick={start}>{tr("Set it up")}</button></section>);
  return (
    <section aria-labelledby="ts-on"><p className="mb-4 inline-flex items-center gap-2 rounded-full bg-canopy px-4 py-2 font-body font-extrabold text-white">{"\u2713"} {tr("Two-step sign-in is on")}</p><h2 id="ts-on" className="font-display text-[1.6rem] font-semibold">{tr("Your account is protected")}</h2>
      <p className="mb-2 mt-2 font-body text-stone/80">{tr("Recovery codes left: {n}", { n: state.recoveryLeft })}</p>
      {state.recoveryLeft <= 3 && <p className="mb-3 rounded-lg border-[1.5px] border-ochre bg-[#F4E6C2] p-3 font-body text-[0.92rem] font-bold">{tr("You are running low on recovery codes. Make new ones.")}</p>}{noteBox}{errorBox}
      <div className="mt-4 flex flex-col gap-3"><button type="button" className={GHOST} onClick={() => { setError(""); setNote(""); setPassword(""); setCode(""); setView("renew"); }}>{tr("Make new recovery codes")}</button>
        {state.canTurnOff ? <button type="button" className={GHOST} onClick={() => { setError(""); setPassword(""); setCode(""); setView("off"); }}>{tr("Turn off two-step sign-in")}</button> : <p className="font-body text-[0.9rem] text-stone/80">{tr("Your account needs two-step sign-in, so it can't be turned off.")}</p>}</div></section>);
}
