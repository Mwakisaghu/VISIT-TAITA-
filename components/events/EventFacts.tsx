import { eatDateLabel, eatParts, ticketState } from "@/lib/events-view";
import type { TicketModeKey } from "@/lib/ticket";

type E = { eventDate: Date; location: string; ticketing: TicketModeKey; status?: string; ticketsCloseAt: Date | null; ticketCapacity: number | null; ticketsTaken: number; ticketPrice: number };

/** The facts first: when, where, and what a ticket is. A band of plain labelled values. */
export default function EventFacts({ event: e, now }: { event: E; now: Date }) {
  const tk = ticketState(e, now);
  const cells: [string, string][] = [["Date", eatDateLabel(e.eventDate)], ["Time", eatParts(e.eventDate).time], ["Where", e.location]];
  if (tk.label) cells.push(["Tickets", tk.label]);
  return (
    <dl className="grid grid-cols-2 border border-stone/25 bg-parchment sm:grid-cols-4">
      {cells.map(([k, v], i) => (
        <div key={k} className={`p-5 ${i > 0 ? "sm:border-l sm:border-stone/20" : ""} ${i > 1 ? "border-t border-stone/20 sm:border-t-0" : ""}`}>
          <dt className="font-body text-[0.65rem] font-bold uppercase tracking-[0.2em] text-stone/75">{k}</dt>
          <dd className="mt-1.5 font-display text-xl leading-snug text-stone">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
