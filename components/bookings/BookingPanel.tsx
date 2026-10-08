"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { COMMON_RULES, formatEat, paymentModeSummary, planPayments, policyLabel, policyLines, type CancellationPolicyKey, type PaymentModeKey } from "@/lib/booking";
import { createBookingAction } from "@/lib/actions/bookings";

export type SessionOption = { id: string; startsAt: string; seatsLeft: number; note: string | null };
const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
const label = "font-body text-sm text-stone/70";

export default function BookingPanel(p: {
  experienceId: string; unitPrice: number; paymentMode: PaymentModeKey; depositPercent: number; balanceDueDays: number; policy: CancellationPolicyKey; maxGuests: number;
  sessions: SessionOption[]; signedIn: boolean; verified: boolean; loginHref: string;
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(p.sessions[0]?.id ?? "");
  const [guests, setGuests] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = p.sessions.find((s) => s.id === sessionId);
  const maxSel = Math.max(1, Math.min(p.maxGuests, selected?.seatsLeft ?? 1));
  const g = Math.min(guests, maxSel);
  const total = p.unitPrice * g;
  const plan = selected ? planPayments({ mode: p.paymentMode, totalAmount: total, depositPercent: p.depositPercent, balanceDueDays: p.balanceDueDays, startsAt: new Date(selected.startsAt), now: new Date() }) : null;
  const request = p.paymentMode === "AFTER_CONFIRMATION";

  if (p.sessions.length === 0) return <p className="font-body text-sm text-stone/70">No dates are open for booking right now. You can still ask the host a question below.</p>;
  if (!p.signedIn) return <p className="font-body text-sm text-stone/70"><Link href={p.loginHref} className="text-rust underline">Sign in</Link> to book. Prices start at {kes(p.unitPrice)} per person.</p>;
  if (!p.verified) return <p className="font-body text-sm text-stone/70">Please verify your email address before booking — we send your booking details there. You can resend the link from <Link href="/account" className="text-rust underline">your account</Link>.</p>;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true); setError("");
        try {
          const r = await createBookingAction(new FormData(form));
          if (!r.ok) return setError(r.error);
          router.push(`/bookings/${r.id}`);
        } catch {
          setError("Something went wrong — please try again.");
        } finally {
          setBusy(false);
        }
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="experienceId" value={p.experienceId} />
      <fieldset className="flex flex-col gap-2">
        <legend className={label}>Choose a date</legend>
        {p.sessions.map((s) => (
          <label key={s.id} className="flex cursor-pointer items-start gap-2 font-body text-sm text-stone">
            <input type="radio" name="sessionId" value={s.id} checked={s.id === sessionId} onChange={() => setSessionId(s.id)} className="mt-1" />
            <span>
              {formatEat(new Date(s.startsAt))}
              <span className="block text-xs text-stone/70">{s.seatsLeft} seat{s.seatsLeft === 1 ? "" : "s"} left{s.note ? ` · ${s.note}` : ""}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className={label}>Guests</span>
        <select name="guests" value={g} onChange={(e) => setGuests(Number(e.target.value))} className="input w-fit" aria-label="Guests">
          {Array.from({ length: maxSel }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={label}>Your phone number (the host may call you)</span>
        <input name="phone" type="tel" required placeholder="0712 345 678" autoComplete="tel" className="input" />
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Anything the host should know? (optional)</span>
        <textarea name="note" rows={2} maxLength={500} className="input" />
      </label>

      <div className="rounded-sm border border-stone/10 bg-stone/5 p-3 font-body text-sm text-stone/80">
        <p>{kes(p.unitPrice)} × {g} guest{g === 1 ? "" : "s"} = <strong>{kes(total)}</strong></p>
        <p className="mt-1 text-stone/70">{paymentModeSummary(p.paymentMode, p.depositPercent, p.balanceDueDays)}</p>
        {plan?.collapsedToFull && <p className="mt-1 text-rust">This date is close, so the full price is due now.</p>}
        {plan && !request && <p className="mt-1">Due now: <strong>{kes(plan.dueNow)}</strong>{plan.balanceDueAt && <> · balance {kes(total - plan.dueNow)} due {formatEat(plan.balanceDueAt)}</>}</p>}
      </div>

      <details className="font-body text-sm text-stone/70">
        <summary className="cursor-pointer text-stone">Cancellation policy: {policyLabel(p.policy)}</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">{policyLines(p.policy).map((l) => <li key={l}>{l}</li>)}</ul>
        <p className="mt-3 text-stone">For every booking:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">{COMMON_RULES.map((l) => <li key={l}>{l}</li>)}</ul>
      </details>

      <label className="flex items-start gap-2 font-body text-sm text-stone">
        <input type="checkbox" name="accept" required className="mt-1" />
        <span>I accept the <Link href="/terms" className="text-rust underline">booking terms</Link> and the {policyLabel(p.policy).toLowerCase()} cancellation policy above.</span>
      </label>

      {error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}
      <button type="submit" disabled={busy} className="focus-ring w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-50">
        {busy ? "One moment…" : request ? "Send request" : "Book now"}
      </button>
    </form>
  );
}
