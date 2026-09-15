import type { FestivalSession, FestivalVenue } from "@prisma/client";
import { sessionCategoryLabel, ticketStatusLabel, formatSessionTime, formatPrice } from "@/lib/format";

type SessionWithVenue = FestivalSession & { venue: FestivalVenue };

export default function SessionCard({ session }: { session: SessionWithVenue }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone/10 py-5">
      <div>
        <p className="font-body text-xs text-rust">{sessionCategoryLabel(session.category)}</p>
        <p className="font-display text-lg text-stone">{session.title}</p>
        <p className="mt-1 font-body text-sm text-stone/60">{session.description}</p>
        <p className="mt-2 font-body text-xs text-stone/50">{session.venue.name}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-body text-sm text-stone/70">
          {formatSessionTime(session.startsAt)}
          {session.endsAt ? ` – ${formatSessionTime(session.endsAt)}` : ""}
        </p>
        <p
          className={`mt-1 font-body text-xs ${
            session.ticketStatus === "SOLD_OUT" ? "text-rust" : "text-stone/50"
          }`}
        >
          {session.ticketStatus === "TICKETED" && session.price
            ? `${ticketStatusLabel(session.ticketStatus)} · ${formatPrice(session.price)}`
            : ticketStatusLabel(session.ticketStatus)}
        </p>
      </div>
    </div>
  );
}
