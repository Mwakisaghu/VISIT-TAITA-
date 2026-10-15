import fs from "fs"; import path from "path";
function walk(dir: string, out: string[] = []): string[] { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else if (/\.(tsx|ts)$/.test(e.name)) out.push(p); } return out; }
async function main() {
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const files = [...walk("app"), ...walk("components")]; const src = files.map((f) => ({ f, s: fs.readFileSync(f, "utf8") }));
  const clamps = src.flatMap(({ f, s }) => [...s.matchAll(/text-\[clamp\((\d*\.?\d+)rem,(\d*\.?\d+)vw,(\d*\.?\d+)rem\)\]/g)].map((m) => ({ f, min: +m[1], vw: +m[2], max: +m[3] })));
  t(`HEADINGS: ${clamps.length} fluid heading sizes are all within the ceiling — none larger than 6 rem (96 px) at their biggest, none smaller than 1.4 rem (22 px) at their smallest (the story pull quote)`, clamps.length >= 20 && clamps.every((c) => c.max <= 6 && c.min >= 1.4));
  t("HEADINGS: the largest of all (the homepage headline) is at most 6 rem (96 px): it was 9.5 rem (152 px)", Math.max(...clamps.map((c) => c.max)) <= 6);
  t("HEADINGS: no oversized fixed sizes anywhere (nothing larger than text-5xl, 48 px)", !src.some(({ s }) => /\btext-(6xl|7xl|8xl|9xl)\b/.test(s)));
  t("HEADINGS: no oversized arbitrary sizes (nothing above 4.5 rem, 72 px)", !src.some(({ s }) => [...s.matchAll(/\btext-\[(\d*\.?\d+)rem\]/g)].some((m) => +m[1] > 4.5)));
  const nav = fs.readFileSync("components/Nav.tsx", "utf8"); const link = /<Link href=\{lp\(l\.href\)\} onClick=\{close\}[^>]*className="([^"]*)"/.exec(nav);
  t("PHONE MENU: the main links are 24 px (text-2xl), not 36 px; the smaller links stay small", !!link && /\btext-2xl\b/.test(link[1]) && !/\btext-(3xl|4xl|5xl)\b/.test(link[1]) && /text-sm/.test(nav));
  t("PAGE TITLES: the section and page titles step from 30 px on a phone to 48 px from the sm breakpoint, in step with the rest (text-3xl sm:text-5xl)", ["app/notes/page.tsx", "app/missions/page.tsx", "app/creators/page.tsx", "app/about/page.tsx"].every((f) => /<h1 className="mt-3 font-display text-3xl sm:text-5xl">/.test(fs.readFileSync(f, "utf8"))));
  t("READING TEXT IS UNTOUCHED: body paragraphs are still text-base and text-lg (16–18 px) in many places — only headings were scaled", src.filter(({ s }) => /font-body text-lg leading-relaxed/.test(s)).length >= 4 && src.filter(({ s }) => /font-body text-base/.test(s)).length >= 4);
  t("RECORD: docs/type-scale.md explains the scale and marks it as applied (so it is never applied twice)", fs.existsSync("docs/type-scale.md") && /Reading text/.test(fs.readFileSync("docs/type-scale.md", "utf8")));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} TYPE SCALE CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
