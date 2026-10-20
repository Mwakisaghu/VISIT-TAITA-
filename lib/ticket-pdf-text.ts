// The words on a printed ticket, in the visitor's language. Marked with T() so the translation checker sees them; passed through trFor() because a download has no page to read the language from.
import type { Locale } from "@/lib/i18n/config";
import { T } from "@/lib/i18n/mark";
import { trFor } from "@/lib/i18n/translate";
import type { TicketPdfLabels } from "@/lib/ticket-pdf";

const TAG: Record<Locale, string> = { en: "en-GB", sw: "sw-KE", fr: "fr", de: "de" };
/** When the event is, for a printed ticket: the weekday, the day, the month AND THE YEAR (a ticket is kept and found again months later), then the time, always in Nairobi time. For example "Saturday 14 November 2026, 14:00". */
export function ticketWhen(d: Date, l: Locale): string {
  const o = { timeZone: "Africa/Nairobi" } as const;
  const day = new Intl.DateTimeFormat(TAG[l], { ...o, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat(TAG[l], { ...o, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return `${day}, ${time}`;
}

export function ticketPdfLabels(l: Locale): TicketPdfLabels {
  const t = (s: string) => trFor(l, s);
  return {
    admits: t(T("Admits one person")), event: t(T("Event")), when: t(T("When")), where: t(T("Where")), holder: t(T("Holder")), number: t(T("Ticket number")), price: t(T("Price")), free: t(T("Free")),
    scan: t(T("Scan at the door")), noQr: t(T("Show this ticket number at the door")), howTitle: t(T("How to use this ticket")),
    how: [t(T("Show this ticket on your phone, or print it.")), t(T("Staff scan the QR code at the door. If it will not scan, give them the ticket number.")), t(T("Each ticket admits one person.")), t(T("Anyone with this code can use the ticket, so keep it private."))],
    times: t(T("Times are East Africa Time (UTC+3).")), issued: t(T("Issued by Visit Taita")), page: t(T("Ticket {n} of {m}")), bring: t(T("What to bring")), getting: t(T("Getting there")),
  };
}
