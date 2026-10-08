"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { admitAction, cancelTicketsAction, confirmPaymentAction, saveTicketSettingsAction, type TicketResult } from "@/lib/actions/tickets";
import { PAY_METHODS, type PayMethodKey } from "@/lib/ticket";
import { formatEat } from "@/lib/booking";

const quiet = "focus-ring rounded-full border border-stone/20 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-50";
const lab = "font-body text-sm text-stone/70";
function useRun() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const run = async (fn: () => Promise<TicketResult>) => { setBusy(true); setError(""); setMessage(""); try { const r = await fn(); if (!r.ok) setError(r.error); else { setMessage(r.message); router.refresh(); } } catch { setError("Something went wrong — please try again."); } finally { setBusy(false); } };
  return { busy, run, note: <>{error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}{message && <p role="status" className="font-body text-sm text-canopy">{message}</p>}</> };
}

export type SettingsInitial = { ticketing: string; ticketPrice: number; ticketCapacity: number | null; ticketsPerPerson: number; ticketHoldHours: number; closeDate: string; closeTime: string; payMethod: string; payTo: string; payAccount: string; payeeName: string; payNotes: string; organiserEmail: string };

export function TicketSettingsForm({ eventId, initial }: { eventId: string; initial: SettingsInitial }) {
  const { busy, run, note } = useRun(); const [f, setF] = useState({ ...initial, ticketPrice: String(initial.ticketPrice || ""), ticketCapacity: initial.ticketCapacity === null ? "" : String(initial.ticketCapacity), ticketsPerPerson: String(initial.ticketsPerPerson), ticketHoldHours: String(initial.ticketHoldHours) });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const method = (f.payMethod || "PAYBILL") as PayMethodKey;
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => saveTicketSettingsAction(eventId, { ...f })); }} className="flex max-w-2xl flex-col gap-4">
      <fieldset className="flex flex-col gap-2"><legend className={lab}>Tickets for this event</legend>
        {[["OFF", "No tickets — the event is just listed"], ["FREE", "Free tickets — issued straight away (for collaborations that don't charge)"], ["PAID", "Paid tickets — guests pay the organiser, who confirms the payment"]].map(([v, l]) => <label key={v} className="flex items-start gap-2 font-body text-sm text-stone"><input type="radio" name="ticketing" value={v} checked={f.ticketing === v} onChange={set("ticketing")} className="mt-1" />{l}</label>)}
      </fieldset>
      {f.ticketing !== "OFF" && (
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1"><span className={lab}>Number of tickets (empty = no limit)</span><input value={f.ticketCapacity} onChange={set("ticketCapacity")} inputMode="numeric" className="input" aria-label="Number of tickets" /></label>
          <label className="flex flex-col gap-1"><span className={lab}>Most tickets per person</span><input value={f.ticketsPerPerson} onChange={set("ticketsPerPerson")} inputMode="numeric" required className="input" aria-label="Tickets per person" /></label>
          <label className="flex flex-col gap-1"><span className={lab}>Sales close (Nairobi time; empty = when it starts)</span><span className="flex gap-2"><input type="date" value={f.closeDate} onChange={set("closeDate")} className="input" aria-label="Sales close date" /><input type="time" value={f.closeTime} onChange={set("closeTime")} className="input" aria-label="Sales close time" /></span></label>
          {f.ticketing === "PAID" && <label className="flex flex-col gap-1"><span className={lab}>Hold unpaid reservations for (hours)</span><input value={f.ticketHoldHours} onChange={set("ticketHoldHours")} inputMode="numeric" className="input" aria-label="Hold hours" /></label>}
        </div>
      )}
      {f.ticketing === "PAID" && (
        <fieldset className="flex flex-col gap-3 rounded-sm border border-stone/10 p-4"><legend className={`${lab} px-1`}>How guests pay — this goes to the organiser, not through this site</legend>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1"><span className={lab}>Price per ticket (KES)</span><input value={f.ticketPrice} onChange={set("ticketPrice")} inputMode="numeric" className="input" aria-label="Ticket price" /></label>
            <label className="flex flex-col gap-1"><span className={lab}>Pay by</span><select value={method} onChange={set("payMethod")} className="input" aria-label="Pay by">{Object.entries(PAY_METHODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
            <label className="flex flex-col gap-1"><span className={lab}>{PAY_METHODS[method].toLabel}</span><input value={f.payTo} onChange={set("payTo")} className="input" aria-label={PAY_METHODS[method].toLabel} /></label>
            <label className="flex flex-col gap-1"><span className={lab}>Account (use {"{TICKET}"} for the ticket number; empty = the ticket number)</span><input value={f.payAccount} onChange={set("payAccount")} className="input" aria-label="Account" /></label>
          </div>
          <label className="flex flex-col gap-1"><span className={lab}>Name shown when paying (so guests can check)</span><input value={f.payeeName} onChange={set("payeeName")} className="input" aria-label="Name shown when paying" /></label>
          <label className="flex flex-col gap-1"><span className={lab}>Anything else guests should know (optional)</span><textarea value={f.payNotes} onChange={set("payNotes")} rows={2} maxLength={300} className="input" aria-label="Payment notes" /></label>
        </fieldset>
      )}
      <label className="flex flex-col gap-1"><span className={lab}>Organiser — the partner&apos;s account email (they can see attendees, confirm payments and admit people at the door; leave empty for none)</span><input value={f.organiserEmail} onChange={set("organiserEmail")} type="email" className="input" aria-label="Organiser email" /></label>
      {note}
      <button type="submit" disabled={busy} className={`${quiet} w-fit`}>{busy ? "Saving…" : "Save ticket settings"}</button>
    </form>
  );
}

export function ConfirmPaymentForm({ eventId, groupId, claimed }: { eventId: string; groupId: string; claimed: string | null }) {
  const { busy, run, note } = useRun(); const [code, setCode] = useState(claimed ?? "");
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => confirmPaymentAction(eventId, groupId, code)); }} className="mt-2 flex max-w-md flex-col gap-2">
      <input value={code} onChange={(e) => setCode(e.target.value)} required placeholder="M-Pesa code you saw for this payment" maxLength={20} className="input" aria-label="M-Pesa code" />
      {note}
      <button type="submit" disabled={busy} className={`${quiet} w-fit`}>{busy ? "Confirming…" : "I received this payment — confirm"}</button>
    </form>
  );
}

export function CancelGroupForm({ eventId, groupId }: { eventId: string; groupId: string }) {
  const { busy, run, note } = useRun(); const [open, setOpen] = useState(false); const [why, setWhy] = useState("");
  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="font-body text-sm text-rust underline">Cancel these tickets…</button>
      {open && (
        <div className="mt-2 flex max-w-md flex-col gap-2 rounded-sm border border-rust/30 bg-rust/5 p-3">
          <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Reason (the guest will see it)" maxLength={200} className="input" aria-label="Reason" />
          <p className="font-body text-xs text-stone/60">If they have paid, you will need to refund them yourself: the payment went to the organiser.</p>
          {note}
          <button type="button" disabled={busy} onClick={() => run(() => cancelTicketsAction(eventId, groupId, why))} className={`${quiet} w-fit`}>Cancel and tell the guest</button>
        </div>
      )}
    </div>
  );
}

const DOOR: Record<string, { tone: string; title: (a: any) => string }> = {
  ADMITTED: { tone: "border-canopy bg-canopy/10 text-canopy", title: (a) => `✓ Let them in — ${a.number}, ${a.holder}` },
  ALREADY_USED: { tone: "border-rust bg-rust/10 text-rust", title: (a) => `✗ Already used — ${a.number}, ${a.holder}${a.usedAt ? ` (${formatEat(new Date(a.usedAt))})` : ""}` },
  NOT_PAID: { tone: "border-ochre bg-ochre/15 text-ochre", title: (a) => `✗ Not paid yet — ${a.number}, ${a.holder}` },
  NOT_VALID: { tone: "border-rust bg-rust/10 text-rust", title: (a) => `✗ Not valid — ${a.number}, ${a.holder} (${String(a.status).toLowerCase()})` },
  WRONG_EVENT: { tone: "border-rust bg-rust/10 text-rust", title: (a) => `✗ Wrong event — this ticket is for “${a.otherEvent}”` },
  NOT_FOUND: { tone: "border-rust bg-rust/10 text-rust", title: () => "✗ No such ticket" },
};
function Outcome({ a }: { a: any }) { const d = DOOR[a.result]; return <p role="status" className={`rounded-sm border-2 p-3 font-body text-sm font-semibold ${d.tone}`}>{d.title(a)}</p>; }

/** Type a ticket number and admit that person. Shows the holder's name so the person at the door can compare. */
export function DoorBox({ eventId }: { eventId: string }) {
  const router = useRouter(); const [number, setNumber] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [out, setOut] = useState<any>(null);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(""); setOut(null); try { const r = await admitAction(eventId, { number }); if (!r.ok) setError(r.error); else { setOut(r.admission); if (r.admission.result === "ADMITTED") { setNumber(""); router.refresh(); } } } catch { setError("Something went wrong — please try again."); } finally { setBusy(false); } }} className="flex max-w-md flex-col gap-2">
      <label className="flex flex-col gap-1 font-body text-sm text-stone/70">Ticket number<input value={number} onChange={(e) => setNumber(e.target.value)} required placeholder="e.g. SHR-0042" autoCapitalize="characters" autoComplete="off" className="input" aria-label="Ticket number" /></label>
      {error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}
      {out && <Outcome a={out} />}
      <button type="submit" disabled={busy} className={`${quiet} w-fit`}>{busy ? "Checking…" : "Check and admit"}</button>
    </form>
  );
}

/** On the page a QR scan opens: nothing happens until staff press the button (a scan or a link preview can never admit anyone by itself). */
export function AdmitButton({ eventId, secret }: { eventId: string; secret: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [out, setOut] = useState<any>(null);
  return (
    <div className="flex max-w-md flex-col gap-2">
      {error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}
      {out && <Outcome a={out} />}
      <button type="button" disabled={busy || out?.result === "ADMITTED"} onClick={async () => { setBusy(true); setError(""); try { const r = await admitAction(eventId, { secret }); if (!r.ok) setError(r.error); else { setOut(r.admission); router.refresh(); } } catch { setError("Something went wrong — please try again."); } finally { setBusy(false); } }} className="focus-ring w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-50">{busy ? "Checking…" : "Admit this person"}</button>
    </div>
  );
}
