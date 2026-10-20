import { currentBookingUser } from "@/lib/booking-auth";
import { checkinBaseUrl } from "@/lib/checkin-url";
import { detailLines, detailParagraphs } from "@/lib/event-details";
import { asLocale } from "@/lib/i18n/config";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { kes } from "@/lib/ticket";
import { buildTicketPdf } from "@/lib/ticket-pdf";
import { ticketPdfLabels, ticketWhen } from "@/lib/ticket-pdf-text";

// A printable PDF of a person's VALID tickets (one page each). It carries each ticket's secret QR code, so it is for the ticket's owner only: signed in, their own tickets, never cached, and rate limited.
export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } as const;
const say = (status: number, text: string) => new Response(text, { status, headers: { ...HEADERS, "Content-Type": "text/plain; charset=utf-8" } });
const slug = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "ticket";

export async function GET(req: Request, ctx: { params: Promise<{ group: string }> }) {
  const me = await currentBookingUser();
  if (!me) return say(401, "Please sign in to download your ticket.");
  if (!(await checkRateLimit(`ticket-pdf:${me.id}`, 30, 60 * 60 * 1000))) return say(429, "Too many downloads. Please try again in a little while.");
  const { group } = await ctx.params;
  const tickets = await prisma.ticket.findMany({ where: { groupId: String(group), userId: me.id, status: "VALID" }, orderBy: { number: "asc" }, include: { event: true } });
  if (tickets.length === 0) return say(404, "No tickets found."); // someone else's tickets, tickets still waiting for payment, used or cancelled ones: all look exactly like tickets that do not exist
  const locale = asLocale(new URL(req.url).searchParams.get("lang")); const L = ticketPdfLabels(locale); const ev = tickets[0].event; const base = checkinBaseUrl();
  const { pdf } = buildTicketPdf({
    event: { name: ev.name, location: ev.location, whenText: ticketWhen(ev.eventDate, locale) },
    tickets: tickets.map((t) => ({ number: t.number, holderName: t.holderName, priceText: t.price > 0 ? kes(t.price) : L.free, verifyUrl: base ? `${base}/tickets/verify/${t.secret}` : null })),
    bring: detailLines(ev.bring).slice(0, 5), getting: detailParagraphs(ev.gettingThere).slice(0, 2), labels: L, siteName: base ? new URL(base).host : "Visit Taita", title: `${tickets[0].number} ${ev.name}`,
  });
  const name = `visit-taita-ticket-${slug(tickets[0].number)}${tickets.length > 1 ? `-and-${tickets.length - 1}-more` : ""}.pdf`;
  return new Response(new Uint8Array(pdf), { status: 200, headers: { ...HEADERS, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Content-Length": String(pdf.length) } });
}
