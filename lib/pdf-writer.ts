// A small, dependency-free PDF writer: enough for a printed ticket (text in four standard fonts, rectangles, circles, lines, dashes, clipping, SVG-style vector paths and a QR code drawn as squares).
// Nothing here knows about tickets. It writes a plain, uncompressed PDF 1.4 file that every viewer and printer opens, with an exact cross-reference table.
//   * Text uses the standard fonts in Windows-1252 (WinAnsi) encoding, so English, Kiswahili, French and German print correctly. A character outside that set (for example Amharic or Arabic) is
//     replaced by "?" rather than printed wrongly: toWinAnsi() is how, and `lossy` says when it happened.
//   * Coordinates are in points (1/72 inch) from the BOTTOM-left of the page, as PDF does.
import { FONT_NAMES, WIDTHS, type PdfFont } from "@/lib/pdf-fonts";

export const A4 = { w: 595.28, h: 841.89 } as const;
export type RGB = readonly [number, number, number];
export const rgb = (hex: string): RGB => { const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) throw new Error("bad colour"); const n = parseInt(m[1], 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

// Windows-1252 bytes 0x80-0x9F that are not Latin-1: the typographic punctuation people actually type.
const CP1252: Record<number, number> = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f };
/** Text as Windows-1252 bytes (a Latin-1 string). Anything not in that set becomes "?", and control characters become spaces. */
export function toWinAnsi(input: string): { text: string; lossy: boolean } {
  let out = "", lossy = false;
  for (const ch of String(input ?? "").normalize("NFC").replace(/[\u2000-\u200b\u202f\u205f\u3000]/g, " ")) { // exotic spaces (a pasted name) are plain spaces, not "?"
    const c = ch.codePointAt(0)!;
    if (c === 0x09 || c === 0x0a || c === 0x0d) out += " ";
    else if (c < 0x20 || c === 0x7f) out += " ";
    else if (c < 0x7f || (c >= 0xa0 && c <= 0xff)) out += String.fromCharCode(c);
    else if (CP1252[c] !== undefined) out += String.fromCharCode(CP1252[c]);
    else { out += "?"; lossy = true; }
  }
  return { text: out, lossy };
}
/** The width of text in points. */
export function measure(text: string, font: PdfFont, size: number): number {
  const w = WIDTHS[font]; let n = 0;
  for (let i = 0; i < text.length; i++) { const code = text.charCodeAt(i); n += w[code - 32] ?? w[0]; }
  return (n * size) / 1000;
}
/** Breaks text into lines no wider than `max` points, at spaces; a single word wider than the line is broken by characters so it can never overflow. At most `maxLines` lines; the last is shortened with an ellipsis if more was left. */
export function wrap(input: string, font: PdfFont, size: number, max: number, maxLines = 99): string[] {
  const words = toWinAnsi(input).text.split(" ").filter(Boolean); const lines: string[] = []; let cur = "";
  const push = () => { if (cur) lines.push(cur); cur = ""; };
  for (const word of words) {
    let w = word;
    while (measure(w, font, size) > max) { // break an over-long word
      let k = w.length; while (k > 1 && measure(w.slice(0, k), font, size) > max) k--;
      push(); lines.push(w.slice(0, k)); w = w.slice(k);
    }
    const trial = cur ? `${cur} ${w}` : w;
    if (measure(trial, font, size) <= max) cur = trial; else { push(); cur = w; }
  }
  push();
  if (lines.length > maxLines) { const kept = lines.slice(0, maxLines); let last = kept[maxLines - 1]; while (last.length > 1 && measure(`${last}\u2026`.replace("\u2026", "..."), font, size) > max) last = last.slice(0, -1); kept[maxLines - 1] = `${last}...`; return kept; }
  return lines;
}
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
const colour = (c: RGB) => `${n2(c[0])} ${n2(c[1])} ${n2(c[2])}`;
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const KAPPA = 0.5522847498;

export class Page {
  readonly w: number; readonly h: number; ops: string[] = []; lossy = false;
  /** Where each piece of text was put (for tests: nothing may run off its box or the page). */
  boxes: { text: string; x: number; y: number; w: number; size: number }[] = [];
  constructor(w: number = A4.w, h: number = A4.h) { this.w = w; this.h = h; }
  private add(s: string) { this.ops.push(s); return this; }
  save() { return this.add("q"); } restore() { return this.add("Q"); }
  fill(c: RGB) { return this.add(`${colour(c)} rg`); } stroke(c: RGB) { return this.add(`${colour(c)} RG`); }
  lineWidth(w: number) { return this.add(`${n2(w)} w`); } dash(on: number, off: number) { return this.add(`[${n2(on)} ${n2(off)}] 0 d`); } solid() { return this.add("[] 0 d"); }
  rect(x: number, y: number, w: number, h: number, mode: "f" | "S" | "B" = "f") { return this.add(`${n2(x)} ${n2(y)} ${n2(w)} ${n2(h)} re ${mode}`); }
  line(x1: number, y1: number, x2: number, y2: number) { return this.add(`${n2(x1)} ${n2(y1)} m ${n2(x2)} ${n2(y2)} l S`); }
  /** A circle (four curves). */
  circle(cx: number, cy: number, r: number, mode: "f" | "S" | "B" = "f") { const k = r * KAPPA; return this.add(`${n2(cx + r)} ${n2(cy)} m ${n2(cx + r)} ${n2(cy + k)} ${n2(cx + k)} ${n2(cy + r)} ${n2(cx)} ${n2(cy + r)} c ${n2(cx - k)} ${n2(cy + r)} ${n2(cx - r)} ${n2(cy + k)} ${n2(cx - r)} ${n2(cy)} c ${n2(cx - r)} ${n2(cy - k)} ${n2(cx - k)} ${n2(cy - r)} ${n2(cx)} ${n2(cy - r)} c ${n2(cx + k)} ${n2(cy - r)} ${n2(cx + r)} ${n2(cy - k)} ${n2(cx + r)} ${n2(cy)} c h ${mode}`); }
  /** A rectangle with rounded corners. */
  roundRect(x: number, y: number, w: number, h: number, r: number, mode: "f" | "S" | "B" = "f") { const k = r * KAPPA; return this.add(`${n2(x + r)} ${n2(y)} m ${n2(x + w - r)} ${n2(y)} l ${n2(x + w - r + k)} ${n2(y)} ${n2(x + w)} ${n2(y + r - k)} ${n2(x + w)} ${n2(y + r)} c ${n2(x + w)} ${n2(y + h - r)} l ${n2(x + w)} ${n2(y + h - r + k)} ${n2(x + w - r + k)} ${n2(y + h)} ${n2(x + w - r)} ${n2(y + h)} c ${n2(x + r)} ${n2(y + h)} l ${n2(x + r - k)} ${n2(y + h)} ${n2(x)} ${n2(y + h - r + k)} ${n2(x)} ${n2(y + h - r)} c ${n2(x)} ${n2(y + r)} l ${n2(x)} ${n2(y + r - k)} ${n2(x + r - k)} ${n2(y)} ${n2(x + r)} ${n2(y)} c h ${mode}`); }
  /** Everything drawn after this stays inside the rounded rectangle (call save() before and restore() after). */
  clipRoundRect(x: number, y: number, w: number, h: number, r: number) { this.roundRect(x, y, w, h, r, "f"); this.ops[this.ops.length - 1] = this.ops[this.ops.length - 1].replace(/ f$/, " W n"); return this; }
  /** One line of text. `align` is relative to x. Returns the width. Characters outside Windows-1252 print as "?" (and set page.lossy). */
  text(input: string, x: number, y: number, o: { font: PdfFont; size: number; color: RGB; align?: "left" | "center" | "right"; spacing?: number }): number {
    const t = toWinAnsi(input); if (t.lossy) this.lossy = true;
    const sp = o.spacing ?? 0; const width = measure(t.text, o.font, o.size) + sp * Math.max(0, t.text.length - 1);
    const left = o.align === "center" ? x - width / 2 : o.align === "right" ? x - width : x;
    this.boxes.push({ text: t.text, x: left, y, w: width, size: o.size });
    this.add(`BT /${o.font} ${n2(o.size)} Tf ${colour(o.color)} rg ${sp ? `${n2(sp)} Tc ` : ""}${n2(left)} ${n2(y)} Td (${esc(t.text)}) Tj ${sp ? "0 Tc " : ""}ET`); // character spacing stays set until changed, so it is put back to normal: it must never leak into the next piece of text
    return width;
  }
  /** SVG path data (absolute M L C H V Z only: what the logo uses) drawn with its own box mapped to a target box; fillRule evenodd. SVG's y axis points down, PDF's up, so y is flipped. */
  svgPath(d: string, view: { x: number; y: number; w: number; h: number }, box: { x: number; y: number; w: number }, c: RGB) {
    const s = box.w / view.w; const X = (px: number) => n2(box.x + (px - view.x) * s); const Y = (py: number) => n2(box.y + (view.h - (py - view.y)) * s);
    const tok = d.match(/[MLCHVZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []; let i = 0, cx = 0, cy = 0, sx = 0, sy = 0; const out: string[] = [];
    const num = () => parseFloat(tok[i++]);
    while (i < tok.length) {
      const cmd = tok[i++];
      if (cmd === "M") { cx = num(); cy = num(); sx = cx; sy = cy; out.push(`${X(cx)} ${Y(cy)} m`); while (i < tok.length && !/^[A-Za-z]$/.test(tok[i])) { cx = num(); cy = num(); out.push(`${X(cx)} ${Y(cy)} l`); } }
      else if (cmd === "L") { while (i < tok.length && !/^[A-Za-z]$/.test(tok[i])) { cx = num(); cy = num(); out.push(`${X(cx)} ${Y(cy)} l`); } }
      else if (cmd === "H") { while (i < tok.length && !/^[A-Za-z]$/.test(tok[i])) { cx = num(); out.push(`${X(cx)} ${Y(cy)} l`); } }
      else if (cmd === "V") { while (i < tok.length && !/^[A-Za-z]$/.test(tok[i])) { cy = num(); out.push(`${X(cx)} ${Y(cy)} l`); } }
      else if (cmd === "C") { while (i < tok.length && !/^[A-Za-z]$/.test(tok[i])) { const a = [num(), num(), num(), num(), num(), num()]; out.push(`${X(a[0])} ${Y(a[1])} ${X(a[2])} ${Y(a[3])} ${X(a[4])} ${Y(a[5])} c`); cx = a[4]; cy = a[5]; } }
      else if (cmd.toUpperCase() === "Z") { out.push("h"); cx = sx; cy = sy; }
      else throw new Error(`unsupported path command ${cmd}`);
    }
    return this.add(`${colour(c)} rg ${out.join(" ")} f*`);
  }
  /** A QR code as black squares on a white square: `size` points across INCLUDING its quiet zone (a white margin of `quiet` modules). `isDark(row, col)` and `count` come from the QR library. */
  qr(isDark: (r: number, c: number) => boolean, count: number, x: number, y: number, size: number, quiet = 4) {
    const unit = size / (count + quiet * 2); this.save().fill([1, 1, 1]).rect(x, y, size, size, "f").fill([0, 0, 0]);
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (isDark(r, c)) this.add(`${n2(x + (quiet + c) * unit)} ${n2(y + size - (quiet + r + 1) * unit)} ${n2(unit + 0.02)} ${n2(unit + 0.02)} re f`);
    return this.restore();
  }
}

export class Pdf {
  pages: Page[] = []; info: { title?: string; author?: string; subject?: string } = {};
  add(page: Page = new Page()) { this.pages.push(page); return page; }
  /** The finished file. */
  build(): Buffer {
    const parts: Buffer[] = []; let offset = 0; const offsets: number[] = [];
    const write = (s: string | Buffer) => { const b = typeof s === "string" ? Buffer.from(s, "latin1") : s; parts.push(b); offset += b.length; };
    const obj = (id: number, body: string) => { offsets[id] = offset; write(`${id} 0 obj\n${body}\nendobj\n`); };
    const hex16 = (s: string) => "<FEFF" + Buffer.from(s, "utf16le").swap16().toString("hex").toUpperCase() + ">"; // a text string that can hold any character
    const fontIds = { H: 3, HB: 4, T: 5, TB: 6 } as const; const firstPage = 7; const pageIds = this.pages.map((_, i) => firstPage + i * 2); const infoId = firstPage + this.pages.length * 2;
    write("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n");
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${this.pages.length} >>`);
    for (const f of Object.keys(fontIds) as PdfFont[]) obj(fontIds[f], `<< /Type /Font /Subtype /Type1 /BaseFont /${FONT_NAMES[f]} /Encoding /WinAnsiEncoding >>`);
    this.pages.forEach((p, i) => {
      const content = p.ops.join("\n"); const id = pageIds[i];
      obj(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n2(p.w)} ${n2(p.h)}] /Resources << /Font << /H ${fontIds.H} 0 R /HB ${fontIds.HB} 0 R /T ${fontIds.T} 0 R /TB ${fontIds.TB} 0 R >> >> /Contents ${id + 1} 0 R >>`);
      obj(id + 1, `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
    });
    const infoParts = [this.info.title && `/Title ${hex16(this.info.title)}`, this.info.author && `/Author ${hex16(this.info.author)}`, this.info.subject && `/Subject ${hex16(this.info.subject)}`, `/Producer ${hex16("Visit Taita")}`].filter(Boolean).join(" ");
    obj(infoId, `<< ${infoParts} >>`);
    const xref = offset; const total = infoId + 1;
    write(`xref\n0 ${total}\n0000000000 65535 f \n`);
    for (let id = 1; id < total; id++) write(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
    write(`trailer\n<< /Size ${total} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return Buffer.concat(parts);
  }
}
