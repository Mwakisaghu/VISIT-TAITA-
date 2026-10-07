import Link from "next/link";
import { redirect } from "next/navigation";
import { PayoutSettingsForm, PrepareButton, RecordPayoutForm } from "@/components/admin/PayoutAdminForms";
import { formatEat } from "@/lib/booking";
import { currentBookingUser } from "@/lib/booking-auth";
import { getSettings, loadEarnings } from "@/lib/payout-ops";
import { kes, normalizePayoutPhone, totalsFor } from "@/lib/payout";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const PILL: Record<string, string> = { PAID: "bg-canopy/10 text-canopy", CANCELLED: "bg-stone/10 text-stone/70" };

export default async function AdminPayoutsPage() {
  const me = await currentBookingUser();
  if (!me?.isAdmin) redirect("/admin"); // editors and content managers can use the admin area, but not handle money
  const now = new Date();
  const settings = await getSettings(prisma);
  const earnings = await loadEarnings(prisma, { now, holdDays: settings.holdDays });
  const payable = earnings.filter((r) => r.state === "payable");
  const hostIds = [...new Set(payable.map((r) => r.hostId))];
  const [hosts, pending, history] = await Promise.all([
    hostIds.length ? prisma.user.findMany({ where: { id: { in: hostIds } }, select: { id: true, name: true, email: true, payoutPhone: true } }) : Promise.resolve([]),
    prisma.hostPayout.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { host: { select: { name: true, email: true } } } }),
    prisma.hostPayout.findMany({ where: { status: { in: ["PAID", "CANCELLED"] } }, orderBy: { processedAt: "desc" }, take: 20, include: { host: { select: { name: true } } } }),
  ]);
  const rows = hostIds.map((id) => {
    const h = hosts.find((x) => x.id === id); const mine = payable.filter((r) => r.hostId === id);
    const t = totalsFor(mine.map((r) => ({ paidAmount: r.paid, refundedAmount: r.refunded })), settings.commissionPercent);
    return { id, name: h?.name ?? "(deleted account)", email: h?.email ?? "", phone: normalizePayoutPhone(h?.payoutPhone ?? ""), t };
  });
  const ready = rows.filter((r) => r.phone);
  const owedAll = ready.reduce((n, r) => n + r.t.net, 0);

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Host payouts</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-stone/60">Guests pay Visit Taita. Once an experience has happened and its earnings have been held, prepare a payout, send it to the host by M-Pesa from your own phone or the M-Pesa portal, then record the receipt here. The host is emailed automatically.</p>

      <section aria-labelledby="settings" className="mt-8"><h2 id="settings" className="font-display text-xl text-stone">Commission and holding period</h2><div className="mt-3"><PayoutSettingsForm commissionPercent={settings.commissionPercent} holdDays={settings.holdDays} /></div></section>

      <section aria-labelledby="ready" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="ready" className="font-display text-xl text-stone">Ready to prepare</h2>{ready.length > 1 && <PrepareButton hostId={null} label={`Prepare all (${kes(owedAll)})`} />}</div>
        {rows.length === 0 ? <p className="mt-3 font-body text-sm text-stone/60">Nothing is payable right now.</p> : (
          <ul className="mt-3 divide-y divide-stone/10">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="font-body text-sm"><p className="text-stone">{r.name} <span className="text-stone/50">· {r.email}</span></p>
                  <p className="text-xs text-stone/60">{r.t.count} booking{r.t.count === 1 ? "" : "s"} · kept {kes(r.t.gross)} − {settings.commissionPercent}% ({kes(r.t.commission)}) = <strong className="text-stone">{kes(r.t.net)}</strong></p>
                  {!r.phone && <p className="text-xs text-rust">No valid payout number yet — ask them to add one on their Payouts page. They are skipped until they do.</p>}</div>
                {r.phone && <PrepareButton hostId={r.id} label={`Prepare ${kes(r.t.net)}`} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="send" className="mt-10">
        <h2 id="send" className="font-display text-xl text-stone">To send ({pending.length})</h2>
        {pending.length === 0 ? <p className="mt-3 font-body text-sm text-stone/60">No prepared payouts are waiting to be sent.</p> : (
          <ul className="mt-3 divide-y divide-stone/10">
            {pending.map((p) => (
              <li key={p.id} className="py-4">
                <p className="font-body text-sm text-stone"><strong>{kes(p.amount)}</strong> → M-Pesa <code>{p.destination}</code> <span className="text-stone/60">· {p.host.name}</span></p>
                <p className="font-body text-xs text-stone/60">{p.bookingCount} booking{p.bookingCount === 1 ? "" : "s"} · kept {kes(p.grossAmount)} − {p.commissionPercent}% ({kes(p.commissionAmount)}) · prepared {formatEat(p.createdAt)}</p>
                <RecordPayoutForm payoutId={p.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section aria-labelledby="history" className="mt-10"><h2 id="history" className="font-display text-xl text-stone">Recently processed</h2>
          <ul className="mt-2 divide-y divide-stone/10 font-body text-sm text-stone/80">
            {history.map((p) => <li key={p.id} className="flex flex-wrap items-center gap-3 py-2"><span className={`rounded-full px-2.5 py-0.5 text-xs ${PILL[p.status]}`}>{p.status === "PAID" ? "Paid" : "Cancelled"}</span><span>{kes(p.amount)} · {p.host.name}</span>{p.reference && <span className="text-xs text-stone/60">receipt {p.reference}</span>}{p.note && <span className="text-xs text-stone/60">— {p.note}</span>}</li>)}
          </ul>
          <p className="mt-3 font-body text-xs text-stone/50"><Link href="/admin/users/audit" className="underline">Activity log</Link> shows who prepared and recorded each payout.</p>
        </section>
      )}
    </div>
  );
}
