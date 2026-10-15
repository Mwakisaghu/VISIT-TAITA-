import fs from "fs"; import path from "path";
// A Next.js route file may only export its HTTP handlers (and a few config fields); a page or layout only itself (and a few config fields). Anything else — a helper "exported for the tests" —
// makes the production build FAIL in its type-validity step ("is not a valid Route export field"), even though development, the type check and every test pass. This guards against that.
const ROUTE_OK = new Set(["GET", "HEAD", "OPTIONS", "POST", "PUT", "DELETE", "PATCH", "dynamic", "dynamicParams", "revalidate", "fetchCache", "runtime", "preferredRegion", "maxDuration", "generateStaticParams"]);
const PAGE_OK = new Set(["default", "metadata", "generateMetadata", "generateViewport", "viewport", "generateStaticParams", "generateImageMetadata", "generateSitemaps", "dynamic", "dynamicParams", "revalidate", "fetchCache", "runtime", "preferredRegion", "maxDuration", "experimental_ppr"]);
const ALLOWED: Record<string, Set<string>> = { route: ROUTE_OK, page: PAGE_OK, layout: PAGE_OK, template: PAGE_OK, loading: PAGE_OK, error: PAGE_OK, "not-found": PAGE_OK, default: PAGE_OK, "global-error": PAGE_OK };
function exportsOf(src: string): Set<string> {
  const out = new Set<string>();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z0-9_$]+)/gm)) out.add(m[1]);
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) for (const part of m[1].split(",")) { const p = part.trim(); if (p && !p.startsWith("type ")) out.add(p.split(/\s+as\s+/).pop()!.trim()); }
  if (/^export\s+default/m.test(src)) out.add("default");
  return out;
}
const invalid = (kind: string, src: string) => [...exportsOf(src)].filter((n) => !ALLOWED[kind].has(n));
// Next.js 15 hands a page or route its `params` and `searchParams` as PROMISES, and its build rejects a props type that also allows a plain object ("Promise<X> | X"), even though development and the type check accept it.
function promiseUnions(src: string): string[] {
  const found: string[] = []; let i = 0;
  for (;;) {
    const j = src.indexOf("Promise<", i); if (j < 0) break;
    let k = j + 8, depth = 1; while (k < src.length && depth) { const c = src[k]; if (c === "<") depth++; else if (c === ">" && src[k - 1] !== "=") depth--; k++; }
    const inner = src.slice(j + 8, k - 1).trim(); const after = src.slice(k, k + 3 + inner.length + 1); const before = src.slice(Math.max(0, j - inner.length - 3), j);
    if (inner && ((after.startsWith(" | ") && after.slice(3, 3 + inner.length) === inner) || (before.endsWith(" | ") && src.slice(j - 3 - inner.length, j - 3).trim() === inner))) found.push(src.slice(Math.max(0, j - 30), k + 3 + inner.length).replace(/\s+/g, " "));
    i = k;
  }
  return found;
}
function walk(dir: string, out: string[] = []): string[] { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else if (/\.tsx?$/.test(e.name) && !e.name.endsWith(".d.ts")) out.push(p.replace(/\\/g, "/")); } return out; }
async function main() {
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  t("THE SCANNER ITSELF: it flags a helper exported from a route (the original mistake), from a page, and a re-exported name, and lets the legitimate exports through (handlers, default, metadata, config fields, types, and `export default async function`)",
    invalid("route", "export async function POST() {}\nexport function summarise() {}").join() === "summarise" &&
    invalid("page", "export const SECTIONS = [];\nexport const LAST_CHECKED = 1;\nexport default function P() {}").join() === "SECTIONS,LAST_CHECKED" &&
    invalid("route", "const helper = 1;\nexport { helper, GET };").join() === "helper,GET".split(",").filter((x) => x !== "GET").join() &&
    invalid("route", "export async function GET() {}\nexport const dynamic = \"force-dynamic\";\nexport const runtime = \"nodejs\";\nexport type Foo = 1;\nexport interface Bar {}").length === 0 &&
    invalid("page", "export const metadata = {};\nexport async function generateMetadata() {}\nexport default async function Page() {}\nexport const revalidate = 60;").length === 0);
  t("THE PROMISE CHECK ITSELF: it flags 'Promise<X> | X' in either order (including a named type and nested braces) and lets a plain Promise, and a Promise next to a different type, through",
    promiseUnions("params: Promise<{ slug: string }> | { slug: string };").length === 1 && promiseUnions("searchParams?: SearchParams | Promise<SearchParams>;").length === 1 && promiseUnions("x: Promise<Record<string, string | string[]>> | Record<string, string | string[]>;").length === 1 &&
    promiseUnions("params: Promise<{ slug: string }>;").length === 0 && promiseUnions("r: Promise<void> | undefined;").length === 0 && promiseUnions("const p = await Promise.all([a, b]);").length === 0);
  const files = ["app"].flatMap((d) => walk(d)).map((f) => ({ f, kind: path.basename(f).replace(/\.tsx?$/, "") })).filter(({ kind }) => kind in ALLOWED);
  const bad = files.map(({ f, kind }) => ({ f, extra: invalid(kind, fs.readFileSync(f, "utf8")) })).filter((x) => x.extra.length);
  t(`EVERY ROUTE, PAGE AND LAYOUT FILE (${files.length} checked): none exports anything Next.js does not allow, so the production build's type-validity step cannot fail on it` + (bad.length ? " — INVALID: " + bad.map((b) => `${b.f} -> ${b.extra.join(", ")}`).join("; ") : ""), files.length > 100 && bad.length === 0);
  const unions = walk("app").flatMap((f) => promiseUnions(fs.readFileSync(f, "utf8")).map((u) => `${f}: ${u}`));
  t(`NO PAGE OR ROUTE ALLOWS A PLAIN-OBJECT params OR searchParams (Next.js 15 passes Promises and its build rejects the union)` + (unions.length ? " — FOUND: " + unions.slice(0, 3).join(" ; ") : ""), unions.length === 0);
  t("THE CSP COLLECTOR (the file that broke a production build): its route exports only POST; the helper lives in lib/csp-report.ts and is still what the route uses", invalid("route", fs.readFileSync("app/api/csp-report/route.ts", "utf8")).length === 0 && /export async function POST/.test(fs.readFileSync("app/api/csp-report/route.ts", "utf8")) && /from "@\/lib\/csp-report"/.test(fs.readFileSync("app/api/csp-report/route.ts", "utf8")) && /export function summarise/.test(fs.readFileSync("lib/csp-report.ts", "utf8")));
  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} ROUTE EXPORT CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
