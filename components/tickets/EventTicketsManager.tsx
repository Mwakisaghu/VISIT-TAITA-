import { CancelGroupForm, ConfirmPaymentForm, DoorBox, TicketSettingsForm, type SettingsInitial } from "@/components/tickets/StaffForms";
import { formatEat, toEatInputs } from "@/lib/booking";
import { eventGroups } from "@/lib/ticket-ops";
import { kes, paymentInstructions, PAY_METHODS, STATUS_LABEL, type PayMethodKey, type TicketStatusKey } from "@/lib/ticket";
import { prisma } from "@/lib/prisma";

const PILL: Record<string, string> = { VALID: "bg-canopy/10 text-canopy", USED: "bg-stone/10 text-stone/70", PENDING_PAYMENT: "bg-ochre/15 text-ochre", CANCELLED: "bg-rust/10 text-rust", EXPIRED: "bg-stone/10 text-stone/60" };
type Ev = NonNullable<Awaited<ReturnType<typeof prisma.event.findUnique>>> & { organiser?: { name: string; email: string } | null };

/** One event's tickets, for its organiser or an admin: settings (admins), the door, and every reservation with the actions that apply to it. */
export default async function EventTicketsManager({ event, canEditSettings }: { event: Ev; canEditSettings: boolean }) {
  const groups = await eventGroups(prisma, event.id);
  const count = (s: string) => groups.reduce((n, g) => n + (g.counts[s] ?? 0), 0);
  const claimsWaiting = groups.filter((g) => g.claimedReference && (g.counts.PENDING_PAYMENT || g.counts.EXPIRED)).length;
  const close = event.ticketsCloseAt ? toEatInputs(event.ticketsCloseAt) : { date: "", time: "" };
  const initial: SettingsInitial = { ticketing: event.ticketing, ticketPrice: event.ticketPrice, ticketCapacity: event.ticketCapacity, ticketsPerPerson: event.ticketsPerPerson, ticketHoldHours: event.ticketHoldHours, closeDate: close.date, closeTime: close.time, payMethod: event.payMethod ?? "PAYBILL", payTo: event.payTo ?? "", payAccount: event.payAccount ?? "", payeeName: event.payeeName ?? "", payNotes: event.payNotes ?? "", organiserEmail: event.organiser?.email ?? "" };
  const example = event.ticketing === "PAID" && event.payMethod && event.ticketPrefix ? paymentInstructions(event, `${event.ticketPrefix}-0001`, 1) : null;
  const tiles: Array<[string, number]> = [["Seats taken", event.ticketsTaken], ["Valid", count("VALID")], ["Admitted", count("USED")], ["Waiting for payment", count("PENDING_PAYMENT")]];

  return (
    <div>
      <p className="mt-2 font-body text-sm text-stone/70">{formatEat(event.eventDate)} · {event.location} · <strong>{event.ticketing === "OFF" ? "no tickets" : event.ticketing === "FREE" ? "free tickets" : `paid tickets, ${kes(event.ticketPrice)} each`}</strong>{event.ticketPrefix ? ` · numbers ${event.ticketPrefix}-0001…` : ""}{event.organiser ? ` · organiser ${event.organiser.name}` : ""}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([l, v]) => <div key={l} className="rounded-sm border border-stone/10 p-4"><p className="font-display text-2xl text-stone">{v}{l === "Seats taken" && event.ticketCapacity !== null ? <span className="text-base text-stone/50"> / {event.ticketCapacity}</span> : null}</p><p className="font-body text-sm text-stone/70">{l}</p></div>)}
      </div>
      {claimsWaiting > 0 && <p className="mt-4 rounded-sm border border-ochre/40 bg-ochre/10 p-3 font-body text-sm text-stone/80">{claimsWaiting} guest{claimsWaiting === 1 ? " says" : "s say"} they&apos;ve paid and {claimsWaiting === 1 ? "is" : "are"} waiting for you to confirm — check your M-Pesa messages against the codes below.</p>}

      {event.ticketing !== "OFF" && (
        <section aria-labelledby="door" className="mt-10"><h2 id="door" className="font-display text-xl text-stone">At the door</h2>
          <p className="mt-1 max-w-2xl font-body text-sm text-stone/60">Scan a guest&apos;s QR code with your phone camera (you must be signed in) and press &ldquo;Admit&rdquo;, or type their ticket number here. Check the name shown against the person in front of you.</p>
          <div className="mt-3"><DoorBox eventId={event.id} /></div></section>
      )}

      {canEditSettings ? (
        <section aria-labelledby="settings" className="mt-10"><h2 id="settings" className="font-display text-xl text-stone">Ticket settings</h2><div className="mt-3"><TicketSettingsForm eventId={event.id} initial={initial} /></div></section>
      ) : example && (
        <section aria-labelledby="how" className="mt-10"><h2 id="how" className="font-display text-xl text-stone">How guests are told to pay</h2>
          <p className="mt-1 font-body text-xs text-stone/50">An example for one ticket. Ask Visit Taita to change these details.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 font-body text-sm text-stone/80">{example.lines.map((l) => <li key={l}>{l}</li>)}</ul></section>
      )}

      <section aria-labelledby="who" className="mt-10">
        <h2 id="who" className="font-display text-xl text-stone">Reservations ({groups.length})</h2>
        {groups.length === 0 && <p className="mt-3 font-body text-sm text-stone/60">No tickets yet.</p>}
        <ul className="mt-3 divide-y divide-stone/10">
          {groups.map((g) => {
            const needsConfirm = !!(g.counts.PENDING_PAYMENT || g.counts.EXPIRED);
            const live = !!(g.counts.PENDING_PAYMENT || g.counts.VALID);
            return (
              <li key={g.groupId} className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-body text-sm text-stone"><strong>{g.holder}</strong> <span className="text-stone/60">· {g.phone} · {g.count} ticket{g.count === 1 ? "" : "s"} ({g.numbers.join(", ")}){g.amount > 0 ? ` · ${kes(g.amount)}` : ""}</span></p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${PILL[g.status]}`}>{STATUS_LABEL[g.status as TicketStatusKey]}</span>
                </div>
                <p className="font-body text-xs text-stone/50">Reserved {formatEat(g.createdAt)}{g.expiresAt && g.counts.PENDING_PAYMENT ? ` · held until ${formatEat(g.expiresAt)}` : ""}{g.paymentReference ? ` · confirmed with ${g.paymentReference}` : ""}</p>
                {g.claimedReference && needsConfirm && <p className="mt-1 font-body text-sm text-ochre">Guest says they paid with code <strong>{g.claimedReference}</strong>.</p>}
                {needsConfirm && event.ticketing === "PAID" && <ConfirmPaymentForm eventId={event.id} groupId={g.groupId} claimed={g.claimedReference} />}
                {live && <CancelGroupForm eventId={event.id} groupId={g.groupId} />}
              </li>
            );
          })}
        </ul>
        {event.ticketing === "PAID" && <p className="mt-4 max-w-2xl font-body text-xs text-stone/50">Payments go straight to the organiser, so this page can&apos;t see them: confirm a reservation only after you&apos;ve seen the money arrive, and refund cancelled guests yourself. One M-Pesa code can confirm only one reservation. {PAY_METHODS[(event.payMethod ?? "OTHER") as PayMethodKey].label}.</p>}
      </section>
    </div>
  );
}
