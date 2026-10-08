"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { reserveTicketsAction } from "@/lib/actions/tickets";
import { kes } from "@/lib/ticket";

const label = "font-body text-sm text-stone/70";

/** The "get tickets" box on an event page. */
export default function TicketPanel(p: { eventId: string; mode: "FREE" | "PAID"; price: number; perPerson: number; left: number | null; signedIn: boolean; verified: boolean; loginHref: string; defaultName: string; closedReason: string | null }) {
  const router = useRouter();
  const max = Math.max(1, Math.min(p.perPerson, p.left ?? p.perPerson));
  const [qty, setQty] = useState(1);
  const [name, setName] = useState(p.defaultName);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const q = Math.min(qty, max);

  if (p.closedReason) return <p className="font-body text-sm text-stone/70">{p.closedReason}</p>;
  if (!p.signedIn) return <p className="font-body text-sm text-stone/70"><Link href={p.loginHref} className="text-rust underline">Sign in</Link> to get {p.mode === "FREE" ? "your free ticket" : "tickets"}{p.mode === "PAID" ? ` — ${kes(p.price)} each` : ""}.</p>;
  if (!p.verified) return <p className="font-body text-sm text-stone/70">Please verify your email address first — we send your tickets there. You can resend the link from <Link href="/account" className="text-rust underline">your account</Link>.</p>;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setError("");
        try { const r = await reserveTicketsAction(p.eventId, q, name, phone); if (!r.ok) setError(r.error); else router.push(`/tickets/${r.id}`); } catch { setError("Something went wrong — please try again."); } finally { setBusy(false); }
      }}
      className="flex max-w-md flex-col gap-4"
    >
      <label className="flex flex-col gap-1"><span className={label}>How many tickets?</span>
        <select value={q} onChange={(e) => setQty(Number(e.target.value))} className="input w-fit" aria-label="Tickets">{Array.from({ length: max }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select>
      </label>
      <label className="flex flex-col gap-1"><span className={label}>Name on the tickets</span><input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" className="input" /></label>
      <label className="flex flex-col gap-1"><span className={label}>Your phone number</span><input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" required placeholder="0712 345 678" autoComplete="tel" className="input" /></label>
      <div className="rounded-sm border border-stone/10 bg-stone/5 p-3 font-body text-sm text-stone/80">
        {p.mode === "FREE" ? <p><strong>Free.</strong> Your {q === 1 ? "ticket is" : "tickets are"} issued straight away.</p> : <><p>{kes(p.price)} × {q} = <strong>{kes(p.price * q)}</strong></p><p className="mt-1 text-stone/60">You&apos;ll be shown how to pay next. Your {q === 1 ? "ticket is" : "tickets are"} held for you, and become valid once the organiser confirms your payment.</p></>}
        {p.left !== null && p.left <= 20 && <p className="mt-1 text-rust">Only {p.left} left.</p>}
      </div>
      {error && <p role="alert" className="font-body text-sm text-rust">{error}</p>}
      <button type="submit" disabled={busy} className="focus-ring w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep disabled:opacity-50">{busy ? "One moment…" : p.mode === "FREE" ? "Get my ticket" : "Reserve tickets"}</button>
    </form>
  );
}
