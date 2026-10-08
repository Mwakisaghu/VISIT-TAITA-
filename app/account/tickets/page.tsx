import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatEat } from "@/lib/booking";
import { currentBookingUser } from "@/lib/booking-auth";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL, type TicketStatusKey } from "@/lib/ticket";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My tickets", robots: { index: false } };

export default async function MyTicketsPage() {
  const me = await currentBookingUser();
  if (!me) redirect("/login?next=/account/tickets");
  const tickets = await prisma.ticket.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 300, include: { event: { select: { name: true, eventDate: true } } } });
  const groups = new Map<string, typeof tickets>();
  for (const t of tickets) groups.set(t.groupId, [...(groups.get(t.groupId) ?? []), t]);
  const now = Date.now();
  const rows = [...groups.entries()].map(([id, ts]) => ({ id, ts, ev: ts[0].event, status: (["PENDING_PAYMENT", "VALID", "USED", "EXPIRED", "CANCELLED"].find((s) => ts.some((t) => t.status === s)) ?? "CANCELLED") as TicketStatusKey }));
  const upcoming = rows.filter((r) => r.ev.eventDate.getTime() > now && ["PENDING_PAYMENT", "VALID"].includes(r.status));
  const rest = rows.filter((r) => !upcoming.includes(r));
  const list = (items: typeof rows) => (
    <ul className="mt-3 divide-y divide-stone/10">
      {items.map((r) => (
        <li key={r.id} className="py-3">
          <Link href={`/tickets/${r.id}`} className="font-body text-stone hover:text-rust">{r.ev.name}</Link>
          <p className="font-body text-xs text-stone/60">{formatEat(r.ev.eventDate)} · {r.ts.length} ticket{r.ts.length === 1 ? "" : "s"} ({r.ts.map((t) => t.number).join(", ")}) · {STATUS_LABEL[r.status]}</p>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/account" className="font-body text-sm text-stone/60 hover:text-rust">← My account</Link>
      <h1 className="mt-3 font-display text-3xl text-stone">My tickets</h1>
      {rows.length === 0 && <p className="mt-6 font-body text-stone/60">You don&apos;t have any tickets yet. <Link href="/events" className="text-rust underline">See what&apos;s on</Link>.</p>}
      {upcoming.length > 0 && <><h2 className="mt-8 font-display text-xl text-stone">Coming up</h2>{list(upcoming)}</>}
      {rest.length > 0 && <><h2 className="mt-8 font-display text-xl text-stone">Past and cancelled</h2>{list(rest)}</>}
    </div>
  );
}
