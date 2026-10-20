// The printable ticket: one A4 page per ticket, laid out like a real ticket. A green header with the logo, the event in a serif headline, when, where, the holder, the ticket number and price, a dashed
// perforation with notches, and a stub with a LARGE QR code (sized so each square is over the 1.2 mm a phone needs). The Visit Taita logo sits faintly behind the details as a watermark.
// Everything is drawn with lib/pdf-writer.ts (no PDF library). The words are passed in already translated.
import QRCode from "qrcode";
import { LOGO } from "@/lib/brand-paths";
import { measure, Page, Pdf, rgb, toWinAnsi, wrap } from "@/lib/pdf-writer";

export type TicketPdfLabels = {
  admits: string; event: string; when: string; where: string; holder: string; number: string; price: string; free: string; scan: string; noQr: string;
  howTitle: string; how: string[]; times: string; bring: string; getting: string; issued: string; page: string; /* "Ticket {n} of {m}" with the placeholders left in */
};
export type TicketPdfInput = {
  event: { name: string; location: string; whenText: string };
  tickets: { number: string; holderName: string; priceText: string; verifyUrl: string | null }[];
  /** Optional "good to know" lines from the event's details: what to bring (a list) and how to get there (a paragraph). */
  bring?: string[]; getting?: string[];
  labels: TicketPdfLabels; siteName: string; title: string;
};

const C = { stone: rgb("#1B1815"), parchment: rgb("#ECE3CD"), dim: rgb("#DCD0B2"), mark: rgb("#E6DCC3"), stub: rgb("#F6F0DF"), rust: rgb("#A6431E"), canopy: rgb("#1D3126"), ochre: rgb("#E3BC6B"), white: rgb("#FFFFFF") } as const;
/** The page geometry, exported so tests can check that nothing leaves the ticket. */
export const GEO = { margin: 40, top: 800, bottom: 440, mainRight: 360, right: 555.28, left: 40, headerH: 70, qr: 170 } as const;
const LOGO_VIEW = { x: -8, y: -8, w: 1016, h: 687.9 };
const spaced = (s: string) => s.toUpperCase();

/** A phone reads a printed QR reliably when each square is at least about 1.2 mm (3.4 pt): the minimum in lib/qr-code.ts's print guide. */
export const MIN_SQUARE_PT = 3.4;
/**
 * The QR for an address: the STRONGEST error correction (Q, which survives a quarter of the code being damaged) at which every square is still at least 1.2 mm across at this size; for an unusually long
 * address it steps down to M (more squares fit the same space at a lower level). A normal address (about 60 to 75 characters) keeps Q.
 */
export function chooseQr(url: string, sizePt: number = GEO.qr) {
  let pick: { level: "Q" | "M"; modules: ReturnType<typeof QRCode.create>["modules"]; squarePt: number } | null = null;
  for (const level of ["Q", "M"] as const) { const m = QRCode.create(url, { errorCorrectionLevel: level }).modules; const squarePt = sizePt / (m.size + 8); pick = { level, modules: m, squarePt }; if (squarePt >= MIN_SQUARE_PT) break; }
  return pick!;
}
/** How many points each QR square takes (see MIN_SQUARE_PT). */
export const qrSquarePt = (url: string, sizePt: number = GEO.qr): number => chooseQr(url, sizePt).squarePt;

function drawTicket(p: Page, input: TicketPdfInput, t: TicketPdfInput["tickets"][number], index: number): void {
  const { labels: L } = input; const { left, top, bottom, mainRight, right, headerH } = GEO; const w = right - left; const H = top - bottom;
  // ---- the ticket's body, clipped to its rounded outline
  p.save().clipRoundRect(left, bottom, w, H, 14);
  p.fill(C.parchment).rect(left, bottom, mainRight - left, H, "f");
  p.fill(C.stub).rect(mainRight, bottom, right - mainRight, H, "f");
  p.svgPath(LOGO.word, LOGO_VIEW, { x: mainRight - 250, y: bottom - 14, w: 240 }, C.mark); p.svgPath(LOGO.land, LOGO_VIEW, { x: mainRight - 250, y: bottom - 14, w: 240 }, C.mark); // the watermark
  p.fill(C.canopy).rect(left, top - headerH, w, headerH, "f");
  const lw = 84, lh = (lw * LOGO_VIEW.h) / LOGO_VIEW.w; p.svgPath(LOGO.word, LOGO_VIEW, { x: left + 20, y: top - headerH + (headerH - lh) / 2, w: lw }, C.parchment); p.svgPath(LOGO.land, LOGO_VIEW, { x: left + 20, y: top - headerH + (headerH - lh) / 2, w: lw }, C.parchment);
  p.text(spaced(L.admits), right - 20, top - headerH / 2 - 3, { font: "HB", size: 8.5, color: C.ochre, align: "right", spacing: 1.6 });
  p.restore();
  // ---- the details (left of the perforation)
  const x = left + 22, colW = mainRight - x - 20; const y0 = top - headerH - 28; const yMin = bottom + 74; // nothing in the details may sit below yMin: the number row lives under it
  const label = (s: string, lx: number, ly: number) => p.text(spaced(s), lx, ly, { font: "HB", size: 7.5, color: C.rust, spacing: 1.8 });
  const half = (colW - 14) / 2;
  // Plan the vertical space BEFORE drawing: the headline is the largest size (down to 17 pt) at which the event name fits in three lines, and the holder drops from 14 to 12 pt if needed; only when nothing fits
  // is the text shortened (with "..."), so it can never run into the number row.
  const plan = (size: number, hSize: number, nameMax: number, wwMax: number, holderMax: number) => {
    const nameLines = wrap(input.event.name, "TB", size, colW, nameMax), when = wrap(input.event.whenText, "HB", 11.5, half, wwMax), where = wrap(input.event.location, "H", 11, half, wwMax), holder = wrap(t.holderName, "HB", hSize, colW, holderMax);
    const leading = size * 1.12, y1 = y0 - 8 - size, y2 = y1 - (nameLines.length - 1) * leading - 26, y3 = y2 - 16 - Math.max(when.length, where.length) * 14 - 10, hLead = hSize + 3;
    return { size, hSize, nameLines, when, where, holder, leading, y1, y2, y3, hLead, lastBaseline: y3 - 17 - (holder.length - 1) * hLead, full: wrap(input.event.name, "TB", size, colW, 99).length <= nameMax };
  };
  let pl = plan(26, 14, 3, 3, 2);
  for (let size = 26; size >= 17; size--) for (const hs of [14, 12]) { const c = plan(size, hs, 3, 3, 2); if (c.full && c.lastBaseline >= yMin) { pl = c; size = 0; break; } if (size === 17 && hs === 12) pl = c; }
  if (pl.lastBaseline < yMin) pl = plan(17, 12, 3, 2, 1); // last resort: shorter location and holder
  if (pl.lastBaseline < yMin) pl = plan(17, 12, 2, 2, 1);
  label(L.event, x, y0);
  pl.nameLines.forEach((ln, i) => p.text(ln, x, pl.y1 - i * pl.leading, { font: "TB", size: pl.size, color: C.stone }));
  label(L.when, x, pl.y2); label(L.where, x + half + 14, pl.y2);
  pl.when.forEach((ln, i) => p.text(ln, x, pl.y2 - 16 - i * 14, { font: "HB", size: 11.5, color: C.stone })); pl.where.forEach((ln, i) => p.text(ln, x + half + 14, pl.y2 - 16 - i * 14, { font: "H", size: 11, color: C.stone }));
  label(L.holder, x, pl.y3); pl.holder.forEach((ln, i) => p.text(ln, x, pl.y3 - 17 - i * pl.hLead, { font: "HB", size: pl.hSize, color: C.stone }));
  // the number and the price, along the bottom
  const by = bottom + 30; label(L.number, x, by + 26); p.text(t.number, x, by, { font: "HB", size: 21, color: C.canopy });
  const pw = Math.max(measure(toWinAnsi(t.priceText).text, "HB", 14), 40); label(L.price, mainRight - 20 - pw, by + 26); p.text(t.priceText, mainRight - 20, by, { font: "HB", size: 14, color: C.stone, align: "right" });
  // ---- the perforation and notches
  p.save().stroke(C.rust).lineWidth(0.9).dash(3.2, 3.2).line(mainRight, bottom + 6, mainRight, top - 6).restore();
  p.save().fill(C.white).circle(mainRight, top, 9, "f").circle(mainRight, bottom, 9, "f").restore();
  p.save().stroke(C.dim).lineWidth(0.8).roundRect(left, bottom, w, H, 14, "S").restore();
  // ---- the stub: the QR code (or, without a public address, just the number)
  const cx = (mainRight + right) / 2;
  if (t.verifyUrl) {
    const q = chooseQr(t.verifyUrl); const size = GEO.qr; const qy = top - headerH - 24 - size;
    p.qr((r, c) => !!q.modules.get(r, c), q.modules.size, cx - size / 2, qy, size);
    p.text(spaced(L.scan), cx, qy - 20, { font: "HB", size: 8, color: C.stone, align: "center", spacing: 1.4 });
    p.text(t.number, cx, qy - 40, { font: "HB", size: 15, color: C.canopy, align: "center" });
  } else {
    wrap(L.noQr, "HB", 11, right - mainRight - 36, 4).forEach((ln, i) => p.text(ln, cx, top - headerH - 70 - i * 15, { font: "HB", size: 11, color: C.stone, align: "center" }));
    p.text(t.number, cx, top - headerH - 170, { font: "HB", size: 22, color: C.canopy, align: "center" });
  }
  p.text(L.page.replace("{n}", String(index + 1)).replace("{m}", String(input.tickets.length)), cx, bottom + 18, { font: "H", size: 8.5, color: C.stone, align: "center" });
  // ---- below the ticket: how to use it, then what to bring and how to get there (when the event has them)
  let hy = bottom - 46; p.text(L.howTitle, left, hy, { font: "TB", size: 16, color: C.canopy }); hy -= 10;
  const bullets = (items: string[], maxLines: number) => { for (const item of items) { const ls = wrap(item, "H", 11, w - 22, maxLines); if (hy - 19 - (ls.length - 1) * 15 < 96) return; hy -= 19; p.fill(C.rust).circle(left + 4, hy + 3.5, 2, "f"); ls.forEach((ln, i) => p.text(ln, left + 18, hy - i * 15, { font: "H", size: 11, color: C.stone })); hy -= (ls.length - 1) * 15; } };
  bullets(L.how, 3);
  const section = (title: string, items: string[] | undefined, asList: boolean) => { if (!items || items.length === 0 || hy < 150) return; hy -= 40; p.text(title, left, hy, { font: "TB", size: 14, color: C.canopy }); hy -= 6; if (asList) bullets(items.slice(0, 5), 2); else { const room = Math.floor((hy - 96) / 17); if (room < 1) return; const ls = wrap(items.join(" "), "H", 11, w, Math.min(4, room)); for (const ln of ls) { hy -= 17; p.text(ln, left, hy, { font: "H", size: 11, color: C.stone }); } } }; // the paragraph is wrapped to the room that is left, so if it is cut it ends with "..."
  section(L.bring, input.bring, true); section(L.getting, input.getting, false);
  p.save().stroke(C.dim).lineWidth(0.8).line(left, 78, right, 78).restore();
  p.text(L.times, left, 60, { font: "H", size: 8.5, color: C.stone }); p.text(L.issued, right, 60, { font: "H", size: 8.5, color: C.stone, align: "right" });
  p.text(input.siteName, right, 46, { font: "HB", size: 8.5, color: C.canopy, align: "right" });
}

/** The finished PDF (one page per ticket). */
export function buildTicketPdf(input: TicketPdfInput): { pdf: Buffer; lossy: boolean; pages: Page[] } {
  const doc = new Pdf(); doc.info = { title: input.title, author: "Visit Taita", subject: input.event.name };
  input.tickets.forEach((t, i) => drawTicket(doc.add(new Page()), input, t, i));
  // "lossy" must look at the ORIGINAL words: the text wrapper has already turned an unprintable character into "?" by the time a page sees it.
  const words = [input.event.name, input.event.location, input.event.whenText, ...input.tickets.flatMap((t) => [t.holderName, t.number, t.priceText]), ...(input.bring ?? []), ...(input.getting ?? [])];
  return { pdf: doc.build(), lossy: doc.pages.some((p) => p.lossy) || words.some((x) => toWinAnsi(x).lossy), pages: doc.pages };
}
