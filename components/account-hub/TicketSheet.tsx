import Link from "next/link";
import SheetBehaviour from "@/components/account-hub/SheetBehaviour";
import TicketCard, { type TicketCardData } from "@/components/account-hub/TicketCard";
import { eyebrow } from "@/components/home/ui";
import { tr } from "@/lib/i18n/server";

/**
 * The open ticket group, beside the list on a large screen and a sheet rising over it on a phone: each ticket drawn like the printed one, a button to download the PDF, and a way to the full ticket page (where you
 * pay, enter an M-Pesa code or cancel). It is plain links and server-drawn markup, so it works without JavaScript; SheetBehaviour only adds Escape, focus and the phone dialog behaviour.
 */
export default function TicketSheet({ groupId, eventName, whenText, location, tickets, validCount, closeHref, pdfHref, fullHref }: { groupId: string; eventName: string; whenText: string; location: string; tickets: TicketCardData[]; validCount: number; closeHref: string; pdfHref: string | null; fullHref: string }) {
  return (
    <>
      <Link href={closeHref} scroll={false} aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-30 bg-stone/50 lg:hidden" />
      <aside id="ticket-sheet" aria-labelledby="ticket-sheet-title" className="fixed inset-x-0 bottom-0 z-40 max-h-[88vh] overflow-y-auto overscroll-contain rounded-t-2xl border-t border-stone/20 bg-[#FBF7EA] px-5 pb-8 pt-5 shadow-[0_-12px_40px_rgba(27,24,21,0.25)] lg:sticky lg:top-6 lg:z-auto lg:max-h-[calc(100vh-3rem)] lg:self-start lg:rounded lg:border lg:shadow-none">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`${eyebrow} text-rust-deep`}>{tr("My tickets")}</p>
            <h2 id="ticket-sheet-title" tabIndex={-1} className="mt-1 break-words font-display text-[1.25rem] font-medium leading-[1.25] tracking-tight outline-none">{eventName}</h2>
          </div>
          <Link href={closeHref} scroll={false} className="focus-ring inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded border border-stone/30 px-3 font-body text-sm font-semibold hover:bg-stone/5">{tr("Close")}</Link>
        </div>
        <p className="mt-2 break-words font-body text-[0.8rem] leading-snug tracking-[0.03em] text-stone/80">{whenText} · {location}</p>
        <ul role="list" className="mt-5 flex flex-col gap-6">
          {tickets.map((t, i) => <li key={t.id}><TicketCard index={i} total={tickets.length} eventName={eventName} whenText={whenText} location={location} ticket={t} /></li>)}
        </ul>
        <div className="mt-6 flex flex-col gap-3">
          {pdfHref && <a href={pdfHref} download className="focus-ring inline-flex min-h-12 items-center justify-center rounded bg-rust px-5 text-center font-body text-[0.95rem] font-bold text-white hover:bg-rust-deep">{validCount > 1 ? tr("Download all {count} tickets (PDF)", { count: validCount }) : tr("Download PDF")}</a>}
          <Link href={fullHref} className="focus-ring inline-flex min-h-11 items-center justify-center text-center font-body text-[0.95rem] font-bold text-rust-deep underline underline-offset-2">{tr("Open the full ticket page")}</Link>
        </div>
        <SheetBehaviour key={groupId} closeHref={closeHref} />
      </aside>
    </>
  );
}
