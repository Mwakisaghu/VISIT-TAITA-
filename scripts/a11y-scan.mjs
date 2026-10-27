// An accessibility scanner for the site's own code: reads every .tsx file's JSX tree (with the TypeScript compiler already in the project) and applies the rules that can be checked WITHOUT a browser.
// It cannot judge colour contrast on a rendered page or whether alt text is a GOOD description: it finds what is certainly missing or unreachable. Run:  node scripts/a11y-scan.mjs  (exit 1 if anything is found)
import fs from "fs"; import path from "path"; import { createRequire } from "module"; const require = createRequire(import.meta.url); const ts = require("typescript");
const ROOT = process.cwd();
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/node_modules|\.next|\.git/.test(e.name)) walk(p, out); } else if (/\.tsx$/.test(e.name)) out.push(p); } return out; };
// ---- colours: read from the project's own tailwind config, so a rule can never go stale
const PALETTE = (() => { try { const cfg = fs.readFileSync(path.join(ROOT, "tailwind.config.ts"), "utf8"); const out = {}; for (const m of cfg.matchAll(/(\w[\w-]*):\s*\{([^{}]*)\}/g)) for (const [, k, v] of m[2].matchAll(/(\w+):\s*"(#[0-9A-Fa-f]{6})"/g)) out[m[1] + (k === "DEFAULT" ? "" : "-" + k)] = v; out.white = "#FFFFFF"; out.black = "#000000"; return out; } catch { return { white: "#FFFFFF", black: "#000000" }; } })();
const PAGE_BG = PALETTE.parchment || "#ECE3CD";
const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const blend = (fg, bg, a) => "#" + [1, 3, 5].map((i) => Math.round(a * parseInt(fg.slice(i, i + 2), 16) + (1 - a) * parseInt(bg.slice(i, i + 2), 16)).toString(16).padStart(2, "0")).join("").toUpperCase();
const hexOf = (name) => (name.startsWith("[#") ? name.slice(1, -1) : PALETTE[name]);
const TEXTC = /(?:^|[\s"'`])text-([a-z]+(?:-[a-z]+)?|\[#[0-9A-Fa-f]{6}\])(?:\/(\d+))?(?=$|[\s"'`])/g; const BGC = /(?:^|[\s"'`])bg-([a-z]+(?:-[a-z]+)?|\[#[0-9A-Fa-f]{6}\])(?:\/(\d+))?(?=$|[\s"'`])/g;
const SIZES = /(?:^|[\s"'`:])text-(?:2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)(?=$|[\s"'`])/;
const classOf = (el) => { const a = attr(el, "className"); return a ? a.getText() : ""; };
/** Only a plain, unconditional class string can be judged: with a ternary, a template or &&, two styles that never apply together would be read as one. */
const plain = (cls) => !!cls && !/\$\{|\?|&&|\|\||\bcn\(|clsx\(/.test(cls);
const bgIn = (cls) => { let last = null; for (const m of cls.matchAll(BGC)) { const h = hexOf(m[1]); if (h) last = m[2] ? blend(h, PAGE_BG, Number(m[2]) / 100) : h; } return last; };
const LABELLERS = new Set(["label", "Label", "Field", "FormField"]);
const has = (el, name) => el.attributes.properties.some((a) => ts.isJsxAttribute(a) && a.name.getText() === name);
const attr = (el, name) => el.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText() === name);
const strVal = (a) => { if (!a || !a.initializer) return a ? true : undefined; if (ts.isStringLiteral(a.initializer)) return a.initializer.text; if (ts.isJsxExpression(a.initializer) && a.initializer.expression && (ts.isStringLiteral(a.initializer.expression) || ts.isNoSubstitutionTemplateLiteral(a.initializer.expression))) return a.initializer.expression.text; return null; /* a computed value */ };
const tagName = (n) => (ts.isJsxElement(n) ? n.openingElement.tagName.getText() : n.tagName.getText());
const opening = (n) => (ts.isJsxElement(n) ? n.openingElement : n);
/** Does this element have something a screen reader can read as its name? */
function named(node) {
  const o = opening(node);
  if (has(o, "aria-label") || has(o, "aria-labelledby") || has(o, "title")) return true;
  if (!ts.isJsxElement(node)) return false;
  let ok = false;
  const visit = (c) => {
    if (ok) return;
    if (ts.isJsxText(c)) { if (c.text.replace(/&nbsp;|\s/g, "").length) ok = true; return; }
    if (ts.isJsxExpression(c)) { const t = c.expression ? c.expression.getText() : ""; if (t && t !== '" "' && t !== "' '") ok = true; return; } // a computed text counts as text
    if (ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c)) {
      const n = tagName(c), co = opening(c);
      if (n === "img" || n === "Image") { const a = strVal(attr(co, "alt")); if (a === null || (typeof a === "string" && a.trim())) ok = true; return; }
      if (has(co, "aria-hidden") && strVal(attr(co, "aria-hidden")) !== "false") return;
      if (n === "svg") { if (has(co, "aria-label") || has(co, "aria-labelledby")) ok = true; else if (ts.isJsxElement(c) && c.children.some((k) => ts.isJsxElement(k) && tagName(k) === "title")) ok = true; return; }
      if (/sr-only|visually-hidden/.test(attr(co, "className") ? attr(co, "className").getText() : "") && ts.isJsxElement(c)) { ok = true; return; }
      if (ts.isJsxElement(c)) c.children.forEach(visit); else if (/^[A-Z]/.test(n)) ok = true; // a custom component might render text: do not guess
    }
  };
  node.children.forEach(visit);
  return ok;
}
export function scanSource(file, text) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); const found = []; const add = (rule, node, msg) => found.push({ file, line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, rule, msg });
  const labelFors = new Set(); const ids = [];
  const collect = (n) => { if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) { const t = n.tagName.getText(); if (t === "label" || t === "Label") { const f = strVal(attr(n, "htmlFor")); if (f) labelFors.add(f); else if (has(n, "htmlFor")) labelFors.add("*"); } } ts.forEachChild(n, collect); };
  collect(sf);
  const hiddenAnc = (anc) => anc.some((a) => (ts.isJsxElement(a) || ts.isJsxSelfClosingElement(a)) && strVal(attr(opening(a), "aria-hidden")) === "true");
  const visit = (n, anc) => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      const t = tagName(n), o = opening(n); const hid = hiddenAnc(anc) || strVal(attr(o, "aria-hidden")) === "true"; const unreachable = /^\{?\s*-1/.test(attr(o, "tabIndex")?.initializer?.getText().replace(/^\{/, "") ?? "");
      if (t === "img" || t === "Image") { if (!has(o, "alt")) add("img-alt", n, `<${t}> has no alt attribute (use alt="" if it is purely decoration)`); else if (strVal(attr(o, "alt")) === "") { const link = [...anc].reverse().find((a) => ts.isJsxElement(a) && ["a", "Link"].includes(tagName(a))); if (link && !named(link)) add("img-alt-link", n, "a link holds only a picture with an empty alt, so the link has no name for a screen reader"); } }
      if (["button", "a", "Link"].includes(t) && !hid) { if (!named(n) && !(t !== "button" && !has(o, "href"))) add("name", n, `<${t}> has no accessible name (no text, aria-label or labelled picture)`); }
      if (["input", "select", "textarea"].includes(t)) {
        const ty = strVal(attr(o, "type")); const spread = o.attributes.properties.some((a) => ts.isJsxSpreadAttribute(a));
        if (!(typeof ty === "string" && ["hidden", "submit", "button", "image", "reset"].includes(ty)) && !spread && !hid) {
          const labelled = has(o, "aria-label") || has(o, "aria-labelledby") || anc.some((a) => ts.isJsxElement(a) && LABELLERS.has(tagName(a))) || (() => { const id = strVal(attr(o, "id")); return !!id && (labelFors.has(id) || labelFors.has("*")) || (has(o, "id") && id === null && labelFors.size > 0); })() || has(o, "title");
          if (!labelled) add("field-label", n, `<${t}${ty ? ` type="${ty}"` : ""}> has no label (wrap it in a <label>, give it an id with a matching htmlFor, or add aria-label)`);
        }
      }
      if (has(o, "onClick") && ["div", "span", "li", "p", "section", "img", "td", "tr"].includes(t) && !(has(o, "role") && has(o, "tabIndex")) ) add("keyboard", n, `<${t}> reacts to clicks but is not a button or link (a keyboard cannot reach it): use <button>, or add role, tabIndex and a key handler`);
      const ti = attr(o, "tabIndex"); if (ti && ti.initializer && /^\{?\s*[1-9]/.test(ti.initializer.getText().replace(/^\{/, ""))) add("tabindex", n, "a positive tabIndex breaks the natural tab order");
      if (t === "iframe" && !has(o, "title")) add("iframe-title", n, "an <iframe> needs a title");
      if (has(o, "aria-hidden") && strVal(attr(o, "aria-hidden")) === "true" && !unreachable && ["a", "button", "input", "select", "textarea", "Link"].includes(t)) add("hidden-focusable", n, "something focusable is hidden from screen readers (aria-hidden)");
      if (t === "a" && strVal(attr(o, "target")) === "_blank" && !/noopener/.test(attr(o, "rel") ? attr(o, "rel").getText() : "")) add("rel", n, 'target="_blank" without rel="noopener noreferrer"');
      const cls = attr(o, "className") ? attr(o, "className").getText() : ""; if (/(^|[\s"'`])outline-none/.test(cls) && !/focus(-visible|-within)?:|focus-ring/.test(cls) && !(unreachable && !["a", "button", "input", "select", "textarea", "Link", "summary"].includes(t))) add("focus-visible", n, "outline-none removes the focus outline and nothing replaces it (add focus-ring or a focus: style)");
      { const judge = plain(cls) && !/(^|\/)(app|components)\/(admin|.*\/admin)\//.test(file) && !/^components\/admin\//.test(file) && !/^app\/admin\//.test(file);
        const tc = !judge ? null : [...cls.matchAll(TEXTC)].map((m) => ({ name: m[1], a: m[2] })).filter((c) => hexOf(c.name) && !/^(xs|sm|base|lg|xl|center|left|right|justify|wrap|nowrap|balance)$/.test(c.name)).pop();
        let judge2 = true;
        if (tc && named(n) && !hid) { let bg = bgIn(cls); if (!bg) for (const a of [...anc].reverse()) { if (ts.isJsxElement(a) || ts.isJsxSelfClosingElement(a)) { const ac = classOf(opening(a)); if ((ac && !plain(ac)) || /gradient|(^|[\s"'`])(from|via|to)-|bg-\[url|bg-cover|bg-image/.test(ac) || (ts.isJsxElement(a) && a.children.some((k) => (ts.isJsxElement(k) || ts.isJsxSelfClosingElement(k)) && ["Image", "img", "video"].includes(tagName(k))))) { bg = "unknown"; break; } const b = plain(ac) ? bgIn(ac) : null; if (b) { bg = b; break; } } }
          if (bg === "unknown") bg = null, judge2 = false;
          const known = bg || (/(^|\/)app\/.*\/?page\.tsx$|(^|\/)app\/layout\.tsx$/.test(file) && !/\/admin\//.test(file) ? PAGE_BG : null); // a component with no background above it inside its own file is not judged: its parent decides
          if (known && judge2) { const fg0 = hexOf(tc.name); const fg = tc.a ? blend(fg0, known, Number(tc.a) / 100) : fg0; const need = SIZES.test(cls) ? 3 : 4.5; const r = contrast(fg, known); if (r < need && !/\bsr-only\b/.test(cls)) add("contrast", n, `text-${tc.name}${tc.a ? "/" + tc.a : ""} on ${known} is ${r.toFixed(1)}:1 (needs ${need}:1)`); } } }
      if (/^h[1-6]$/.test(t) && !named(n)) add("heading-empty", n, `<${t}> is empty`);
    }
    ts.forEachChild(n, (c) => visit(c, [...anc, n]));
  };
  visit(sf, []); return found;
}
export function scanAll(root = ROOT) { const out = []; for (const dir of ["app", "components"]) { const d = path.join(root, dir); if (!fs.existsSync(d)) continue; for (const f of walk(d)) out.push(...scanSource(path.relative(root, f).replace(/\\/g, "/"), fs.readFileSync(f, "utf8"))); } return out; }
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("a11y-scan.mjs")) {
  const SHOWN = Number((process.argv.find((x) => x.startsWith("--show=")) || "--show=5").slice(7)) || 5; // how many examples to print per kind: node scripts/a11y-scan.mjs --show=40
  const all = scanAll(); const by = {}; for (const f of all) (by[f.rule] ??= []).push(f);
  for (const [r, v] of Object.entries(by).sort((a, b) => b[1].length - a[1].length)) { console.log(`\n== ${r}: ${v.length}`); for (const f of v.slice(0, SHOWN)) console.log(`   ${f.file}:${f.line}  ${f.msg}`); }
  console.log(all.length ? `\n${all.length} accessibility problem(s) found.` : "\nNo accessibility problems found."); process.exit(all.length ? 1 : 0);
}
