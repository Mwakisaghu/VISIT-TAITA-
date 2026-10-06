"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addSessions, cancelSessionAction, saveBookingSettings, updateSession, type HostResult } from "@/lib/actions/bookings-host";
import { POLICIES, policyLines, type CancellationPolicyKey } from "@/lib/booking";

const label = "font-body text-sm text-stone/70";
const primary = "focus-ring w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-50";
const quiet = "focus-ring rounded-full border border-stone/20 px-4 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust disabled:opacity-50";

function useRun() {
  const router = useRouter();
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const run = async (fn: () => Promise<HostResult>, onOk?: () => void) => {
    setBusy(true); setError(""); setMessage("");
    try { const r = await fn(); if (!r.ok) setError(r.error); else { setMessage(r.message ?? "Saved."); onOk?.(); router.refresh(); } } catch { setError("Something went wrong — please try again."); } finally { setBusy(false); }
  };
  const note = <>{error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}{message && <p role="status" className="font-body text-sm text-canopy">{message}</p>}</>;
  return { busy, run, note };
}

export type Settings = { bookingEnabled: boolean; paymentMode: string; depositPercent: number; balanceDueDays: number; cancellationPolicy: string; bookingCutoffHours: number; maxGuestsPerBooking: number };

export function SettingsForm({ experienceId, s }: { experienceId: string; s: Settings }) {
  const { busy, run, note } = useRun();
  const [policy, setPolicy] = useState(s.cancellationPolicy as CancellationPolicyKey);
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => saveBookingSettings(experienceId, fd)); }} className="flex max-w-xl flex-col gap-4">
      <label className="flex items-center gap-2 font-body text-sm text-stone"><input type="checkbox" name="bookingEnabled" defaultChecked={s.bookingEnabled} /> Let guests book this experience online</label>
      <label className="flex flex-col gap-1"><span className={label}>How guests pay</span>
        <select name="paymentMode" defaultValue={s.paymentMode} className="input">
          <option value="FULL">Full price when they book</option>
          <option value="DEPOSIT">A deposit now, the balance later</option>
          <option value="AFTER_CONFIRMATION">They request; I accept; then they pay</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1"><span className={label}>Deposit (%) — deposit option</span><input name="depositPercent" type="number" min={10} max={90} defaultValue={s.depositPercent} className="input" /></label>
        <label className="flex flex-col gap-1"><span className={label}>Balance due (days before)</span><input name="balanceDueDays" type="number" min={1} max={30} defaultValue={s.balanceDueDays} className="input" /></label>
        <label className="flex flex-col gap-1"><span className={label}>Bookings close (hours before)</span><input name="bookingCutoffHours" type="number" min={2} max={168} defaultValue={s.bookingCutoffHours} className="input" /></label>
        <label className="flex flex-col gap-1"><span className={label}>Most guests per booking</span><input name="maxGuestsPerBooking" type="number" min={1} max={50} defaultValue={s.maxGuestsPerBooking} className="input" /></label>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className={label}>Cancellation policy (guests see this before they pay)</legend>
        {(Object.keys(POLICIES) as CancellationPolicyKey[]).map((k) => (
          <label key={k} className="flex items-start gap-2 font-body text-sm text-stone">
            <input type="radio" name="cancellationPolicy" value={k} checked={policy === k} onChange={() => setPolicy(k)} className="mt-1" />
            <span><strong>{POLICIES[k].label}</strong><span className="block text-xs text-stone/60">{policyLines(k).join(" ")}</span></span>
          </label>
        ))}
      </fieldset>
      {note}
      <button type="submit" disabled={busy} className={primary}>{busy ? "Saving…" : "Save settings"}</button>
    </form>
  );
}

export function AddDatesForm({ experienceId, defaultCapacity }: { experienceId: string; defaultCapacity: number }) {
  const { busy, run, note } = useRun();
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => addSessions(experienceId, fd)); }} className="flex max-w-xl flex-col gap-3">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1"><span className={label}>Date</span><input name="date" type="date" required className="input" /></label>
        <label className="flex flex-col gap-1"><span className={label}>Start time (Nairobi)</span><input name="time" type="time" required defaultValue="09:00" className="input" /></label>
        <label className="flex flex-col gap-1"><span className={label}>Guests it can take</span><input name="capacity" type="number" min={1} max={500} defaultValue={defaultCapacity} className="input" /></label>
        <label className="flex flex-col gap-1"><span className={label}>Repeat every week for</span><select name="repeatWeeks" defaultValue="1" className="input">{[1, 2, 4, 8, 12, 26].map((n) => <option key={n} value={n}>{n === 1 ? "just this date" : `${n} weeks`}</option>)}</select></label>
      </div>
      <label className="flex flex-col gap-1"><span className={label}>Note for guests (optional) — e.g. the meeting point</span><input name="note" maxLength={200} className="input" /></label>
      {note}
      <button type="submit" disabled={busy} className={primary}>{busy ? "Adding…" : "Add date(s)"}</button>
    </form>
  );
}

export function SessionRow({ id, capacity, seatsTaken, status, note, whenLabel }: { id: string; capacity: number; seatsTaken: number; status: string; note: string | null; whenLabel: string }) {
  const { busy, run, note: msg } = useRun();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  if (status === "CANCELLED") return <li className="py-3 font-body text-sm text-stone/50 line-through">{whenLabel} — cancelled</li>;
  return (
    <li className="py-3">
      <p className="font-body text-sm text-stone">{whenLabel} <span className="text-stone/50">· {seatsTaken}/{capacity} booked{status === "CLOSED" ? " · closed to new bookings" : ""}</span></p>
      <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => updateSession(id, fd)); }} className="mt-2 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 font-body text-xs text-stone/60">Capacity<input name="capacity" type="number" min={1} max={500} defaultValue={capacity} className="input w-24" /></label>
        <label className="flex flex-col gap-1 font-body text-xs text-stone/60">Status<select name="status" defaultValue={status} className="input"><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select></label>
        <label className="flex flex-col gap-1 font-body text-xs text-stone/60">Note<input name="note" defaultValue={note ?? ""} maxLength={200} className="input" /></label>
        <button type="submit" disabled={busy} className={quiet}>Save</button>
        <button type="button" onClick={() => setCancelling(!cancelling)} className="font-body text-sm text-rust underline">Cancel this date</button>
      </form>
      {cancelling && (
        <div className="mt-3 flex max-w-md flex-col gap-2 rounded-sm border border-rust/30 p-3">
          <p className="font-body text-xs text-stone/70">Everyone booked on this date is told and refunded in full.</p>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (they will see it)" maxLength={200} className="input" aria-label="Reason" />
          <button type="button" disabled={busy} onClick={() => run(() => cancelSessionAction(id, reason), () => setCancelling(false))} className={quiet}>Cancel the date and refund everyone</button>
        </div>
      )}
      {msg}
    </li>
  );
}
