import QrCode from "@/components/account-hub/QrCode";
import { CHIP_TONE } from "@/components/account-hub/SubpageFrame";
import Logo from "@/components/brand/Logo";
import Watermark from "@/components/brand/Watermark";
import { eyebrow } from "@/components/home/ui";
import { ticketChip } from "@/lib/account-hub-text";
import { tr } from "@/lib/i18n/server";

export type TicketCardData = { id: string; number: string; holderName: string; status: string; priceText: string; qrUrl: string | null };

/**
 * One ticket, drawn like the printed one: a green header with the logo, the event in a serif headline, when, where, the holder, the number and price; a perforation with notches; and a stub with the QR code
 * for the door (or, when there is no QR to show, a plain sentence saying why). The notches are the colour of the panel behind the card (#FBF7EA).
 */
export default function TicketCard({ index, total, eventName, whenText, location, ticket: t }: { index: number; total: number; eventName: string; whenText: string; location: string; ticket: TicketCardData }) {
  const chip = ticketChip(t.status); const valid = t.status === "VALID";
  const note = valid ? (t.qrUrl ? null : tr("The QR code cannot be shown right now. Give the staff your ticket number at the door."))
    : t.status === "PENDING_PAYMENT" ? tr("Your QR code appears here once your payment is confirmed. Open the full ticket page to pay.")
    : t.status === "USED" ? tr("This ticket has been used.")
    : t.status === "EXPIRED" ? tr("This reservation expired. If you already paid, open the full ticket page.")
    : tr("This ticket was cancelled.");
  return (
    <article aria-label={tr("Ticket {n} of {m}", { n: index + 1, m: total })} className="relative overflow-hidden rounded-[14px] border border-stone/15 bg-parchment text-stone shadow-sm">
      <div className="flex items-center justify-between gap-3 bg-canopy-deep px-5 py-4">
        <Logo variant="full" decorative className="h-9 w-auto shrink-0 text-parchment" />
        <span className={`${eyebrow} text-right text-ochre-light`}>{valid ? tr("Admits one person") : chip.text}</span>
      </div>
      <Watermark className="-bottom-10 -right-10 h-44 w-72 text-stone opacity-[0.06]" />
      <div className="relative px-5 pb-6 pt-5">
        <p className={`${eyebrow} text-rust-deep`}>{tr("Event")}</p>
        <h3 className="mt-2 break-words font-display text-[1.625rem] font-medium leading-[1.15] tracking-tight">{eventName}</h3>
        <dl className="mt-5 grid gap-x-4 gap-y-4 sm:grid-cols-2">
          <div className="min-w-0"><dt className={`${eyebrow} text-rust-deep`}>{tr("When")}</dt><dd className="mt-1 break-words font-body text-[0.95rem] font-semibold leading-snug">{whenText}</dd></div>
          <div className="min-w-0"><dt className={`${eyebrow} text-rust-deep`}>{tr("Where")}</dt><dd className="mt-1 break-words font-body text-[0.95rem] leading-snug">{location}</dd></div>
          <div className="min-w-0 sm:col-span-2"><dt className={`${eyebrow} text-rust-deep`}>{tr("Holder")}</dt><dd className="mt-1 break-words font-body text-[1.0625rem] font-semibold leading-snug">{t.holderName}</dd></div>
        </dl>
        <div className="mt-5 flex items-end justify-between gap-4">
          <div className="min-w-0"><p className={`${eyebrow} text-rust-deep`}>{tr("Ticket number")}</p><p className="mt-1 break-words font-body text-[1.375rem] font-bold leading-tight text-canopy-deep">{t.number}</p></div>
          <div className="shrink-0 text-right"><p className={`${eyebrow} text-rust-deep`}>{tr("Price")}</p><p className="mt-1 font-body text-[1.0625rem] font-bold leading-tight">{t.priceText}</p></div>
        </div>
      </div>
      <div className="relative" aria-hidden="true">
        <div className="border-t-2 border-dashed border-rust/60" />
        <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full border border-stone/15 bg-[#FBF7EA]" />
        <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full border border-stone/15 bg-[#FBF7EA]" />
      </div>
      <div className="relative bg-[#F6F0DF] px-5 py-6 text-center">
        {valid && t.qrUrl ? (
          <>
            <div className="mx-auto w-full max-w-[13rem] rounded bg-white p-1 shadow-sm"><QrCode url={t.qrUrl} label={tr("Scan at the door")} className="h-auto w-full" /></div>
            <p className={`${eyebrow} mt-4 text-stone`}>{tr("Scan at the door")}</p>
            <p className="mt-1 font-body text-[0.95rem] leading-relaxed text-stone/80">{tr("Show this QR code at the door.")}</p>
          </>
        ) : (
          <>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-body text-[0.78rem] font-bold ${CHIP_TONE[chip.tone]}`}>{chip.text}</span>
            {note && <p className="mx-auto mt-3 max-w-[18rem] break-words font-body text-[0.95rem] leading-relaxed text-stone/80">{note}</p>}
          </>
        )}
      </div>
    </article>
  );
}
