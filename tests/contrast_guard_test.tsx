import fs from "fs"; import path from "path";
function walk(dir: string, out: string[] = []): string[] { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== ".next") walk(p, out); } else if (/\.tsx$/.test(e.name)) out.push(p); } return out; }
const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as any;
const L = ([r, g, b]: number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const over = (fg: string, alpha: number, bg: string) => { const f = rgb(fg), b = rgb(bg); return f.map((c, i) => c * alpha + b[i] * (1 - alpha)); };
const ratio = (a: number[], b: number[]) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
async function main() {
  const cfg = fs.readFileSync(fs.existsSync("tailwind.config.ts") ? "tailwind.config.ts" : "tailwind.config.js", "utf8");
  const hex = (name: string, key = "DEFAULT") => { const m = new RegExp(`${name}: \\{[^}]*?${key}: "(#[0-9A-Fa-f]{6})"`).exec(cfg); if (!m) throw new Error("colour not found: " + name + "." + key); return m[1]; };
  const stone = hex("stone"), parchment = hex("parchment"), dim = hex("parchment", "dim"), light = "#F4EDDC", white = "#FFFFFF";
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const files = [...walk("app"), ...walk("components")]; const faint = files.flatMap((f) => [...fs.readFileSync(f, "utf8").matchAll(/text-stone\/(30|35|40|45|50|55|60|65|70)(?![0-9])/g)].map(() => f));
  t("NO FAINT TEXT: no page or component sets dark text fainter than 80% strength (the shades 30-70% measured 3.2 to 4.3 against the 4.5 the accessibility rule needs on real pages)" + (faint.length ? " — FOUND in: " + [...new Set(faint)].slice(0, 4).join(", ") : ""), faint.length === 0);
  const bgs: [string, string][] = [["parchment", parchment], ["the darker panel (parchment dim)", dim], ["the lighter panel", light], ["white", white]];
  const r80 = bgs.map(([n, b]) => [n, ratio(over(stone, 0.8, b), rgb(b))] as [string, number]);
  t("THE MATHS (80% is enough): dark text at 80% strength is at least 4.5:1 on every light background the site uses — " + r80.map(([n, r]) => `${n} ${r.toFixed(1)}`).join(", "), r80.every(([, r]) => r >= 4.5));
  const r50 = ratio(over(stone, 0.5, parchment), rgb(parchment)), r60 = ratio(over(stone, 0.6, dim), rgb(dim));
  t("THE MATHS (the calculator is honest): it reproduces what the real-page check measured — 50% on parchment is below 4.5 (about 3.2) and 60% on the darker panel is below 4.5 — so the guard would have caught the original problem", r50 < 4.5 && r50 > 2.8 && r60 < 4.5 && Math.abs(ratio(rgb("#000000"), rgb("#FFFFFF")) - 21) < 0.01);
  const brand = [["rust-deep", hex("rust", "deep")], ["canopy", hex("canopy")]]; const bad = brand.flatMap(([n, c]) => bgs.filter(([, b]) => ratio(rgb(c), rgb(b)) < 4.5).map(([bn]) => `${n} on ${bn}`));
  t("BRAND TEXT COLOURS (small text): rust-deep and canopy are readable (4.5:1 or more) on every light background" + (bad.length ? " — TOO FAINT: " + bad.join(", ") : ""), bad.length === 0);
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} CONTRAST GUARD CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
