import React from "react"; (globalThis as any).React = React;
import { renderToStaticMarkup } from "react-dom/server";
async function main() {
  const Stamp = (await import("@/components/stamps/StampMark")).default as any;
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const s1 = renderToStaticMarkup(React.createElement(Stamp, { name: "Ngangao Forest", verified: true })), s2 = renderToStaticMarkup(React.createElement(Stamp, { name: "Ngangao Forest", verified: false }));
  const two = renderToStaticMarkup(React.createElement(React.Fragment, null, React.createElement(Stamp, { name: "A", verified: true }), React.createElement(Stamp, { name: "B", verified: true }))); const longText = renderToStaticMarkup(React.createElement(Stamp, { name: "x".repeat(60), verified: true }));
  t("STAMP: a screen reader hears 'Checked in: Ngangao Forest' or 'Marked as visited: …'; a verified stamp is solid and a self-reported one dashed; the ring text names the place in capitals", /aria-label="Checked in: Ngangao Forest"/.test(s1) && /aria-label="Marked as visited: Ngangao Forest"/.test(s2) && !/stroke-dasharray/.test(s1) && /stroke-dasharray="5 3"/.test(s2) && /CHECKED IN · NGANGAO FOREST ·/.test(s1) && /BEEN HERE · NGANGAO FOREST ·/.test(s2) && /textLength="270"/.test(s1));
  t("STAMP: two stamps on one page get different ring ids (so the lettering of one can't be drawn on the other), and a very long name is cut to 22 letters on the ring (the full name stays in the spoken label)", new Set([...two.matchAll(/<path id="(ring-[^"]+)"/g)].map((m) => m[1])).size === 2 && /X{22}[^X]/.test(longText.replace(/aria-label="[^"]*"/, "")) && !/X{23}/.test(longText.replace(/aria-label="[^"]*"/, "")) && /x{60}/.test(longText));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} STAMP MARK CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
