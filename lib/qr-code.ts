import QRCode from "qrcode";

// Print-ready QR codes. Level Q (about 25% of the code can be damaged and it still reads) because fabric stretches, creases and
// wears; a 4-module white border (the QR standard's "quiet zone") is built in; always black on white — the most reliable pairing.
const OPTS = { errorCorrectionLevel: "Q" as const, margin: 4, color: { dark: "#000000", light: "#ffffff" } };

/** A vector code: sharp at any size, which is what a screen-printer or garment printer wants. */
export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { ...OPTS, type: "svg" });
}

/** A raster code at (about) the requested width. Whole-pixel modules, so edges are crisp. */
export async function qrPng(url: string, width: number): Promise<Buffer> {
  const w = Math.max(200, Math.min(4000, Math.round(width)));
  return QRCode.toBuffer(url, { ...OPTS, type: "png", width: w });
}

/** How many squares across the code is (without the border) — fewer squares means bigger, easier-to-scan ones. */
export function qrModules(url: string): number {
  return QRCode.create(url, { errorCorrectionLevel: "Q" }).modules.size;
}

/**
 * Printing advice. A phone reads a code reliably when each square is at least ~1.2 mm across (screen print / DTF on fabric),
 * and the 4-square border counts towards the printed width. Fabric needs more margin for error than paper, so we recommend 1.8 mm.
 */
export function printGuide(modules: number) {
  const across = modules + 8; // the code plus its 4-square border on each side
  const minimumMm = Math.ceil(across * 1.2);
  const recommendedMm = Math.ceil(across * 1.8);
  return { modules, minimumMm, recommendedMm, squareMmAt: (widthMm: number) => Math.round((widthMm / across) * 100) / 100 };
}

/**
 * The QR code as ONE SVG path of squares, so a page can draw it with ordinary SVG elements (no raw HTML is injected, and the address it carries never appears as text). `size` is the width in squares INCLUDING the
 * white margin (the "quiet zone", 4 squares each side); `d` is the path, with each row's neighbouring squares joined into one bar.
 */
export function qrPath(url: string): { size: number; d: string } {
  const m = QRCode.create(url, { errorCorrectionLevel: "Q" }).modules; const quiet = 4; let d = "";
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (!m.get(r, c)) continue; let len = 1; while (c + len < m.size && m.get(r, c + len)) len++;
      d += `M${c + quiet} ${r + quiet}h${len}v1h-${len}z`; c += len - 1;
    }
  }
  return { size: m.size + quiet * 2, d };
}
