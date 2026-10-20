process.env.NODE_ENV = "test";
import React from "react"; (globalThis as any).React = React;
import fs from "fs"; import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
const STORE = "https://cdn.visittaita.co.ke/visit-taita-media";

async function main() {
  const IS = await import("@/lib/image-src"); const { canOptimize, optimizedUrl, optimizableHosts, OPTIMIZER_WIDTHS } = IS;
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, ok]);
  const env = { S3_PUBLIC_URL: STORE } as Record<string, string | undefined>;

  // ===== which pictures may be optimised =====
  const yes: [string, string][] = [["an upload on the storage host", `${STORE}/images/photo/202610/abc123.webp`], ["an Unsplash picture", "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=2000"], ["a file in /public", "/brand/logo.png"], ["host in capitals (URLs are case-insensitive)", "https://IMAGES.UNSPLASH.COM/photo-1"], ["storage host with a query string", `${STORE}/x.webp?v=2`]];
  for (const [label, src] of yes) t(`OPTIMISE: ${label}`, canOptimize(src, env) === true);
  const no: [string, any][] = [["a random website (a pasted link)", "https://example.com/pic.jpg"], ["plain http", "http://images.unsplash.com/photo-1"], ["a look-alike host (images.unsplash.com.evil.com)", "https://images.unsplash.com.evil.com/x.jpg"], ["an approved name in the PATH of another host", "https://evil.com/images.unsplash.com/x.jpg"], ["credentials in the address", "https://user:pw@images.unsplash.com/x.jpg"], ["a non-standard port", "https://images.unsplash.com:8443/x.jpg"], ["a protocol-relative address (//host is NOT local)", "//images.unsplash.com/x.jpg"], ["a backslash trick", "/\\evil.com/x.jpg"], ["javascript:", "javascript:alert(1)"], ["a data: address", "data:image/png;base64,AAAA"], ["empty", ""], ["spaces", "   "], ["null", null], ["undefined", undefined], ["a number", 123], ["an object", { src: "x" }], ["a local path with a query string", "/pic.jpg?x=1"], ["ftp", "ftp://images.unsplash.com/x.jpg"], ["a sibling sub-domain of the storage host", "https://evil.visittaita.co.ke/x.webp"], ["the storage host on a different scheme", "http://cdn.visittaita.co.ke/x.webp"]];
  for (const [label, src] of no) t(`LEAVE ALONE: ${label}`, canOptimize(src, env) === false);
  t("with NO storage configured only Unsplash, Wikimedia Commons and /public are optimised — an upload URL is left alone (so a half-configured site shows pictures instead of breaking them)", canOptimize(`${STORE}/x.webp`, {}) === false && canOptimize("https://images.unsplash.com/x", {}) === true && canOptimize("https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg", {}) === true && canOptimize("https://commons.wikimedia.org/wiki/File:X.jpg", {}) === false && JSON.stringify(optimizableHosts({})) === '["images.unsplash.com","upload.wikimedia.org"]');
  t("a malformed S3_PUBLIC_URL doesn't crash anything", (() => { try { return canOptimize("https://images.unsplash.com/x", { S3_PUBLIC_URL: "not a url" }) === true && canOptimize("https://x.co/y", { S3_PUBLIC_URL: "::::" }) === false; } catch { return false; } })());

  // ===== the rule and next.config.js can't drift apart =====
  const cfgPath = path.resolve("next.config.js"); const loadCfg = (e: Record<string, string>) => { const keep = { ...process.env }; for (const k of ["S3_PUBLIC_URL"]) delete process.env[k]; Object.assign(process.env, e); delete require.cache[cfgPath]; const c = require(cfgPath); process.env = keep; delete require.cache[cfgPath]; return c; };
  for (const e of [{}, { S3_PUBLIC_URL: STORE }, { S3_PUBLIC_URL: "https://pub-abc123.r2.dev" }, { S3_PUBLIC_URL: "https://bucket.s3.eu-west-1.amazonaws.com/" }]) { const c = loadCfg(e as any); const cfgHosts = c.images.remotePatterns.map((p: any) => p.hostname).sort().join(); const ruleHosts = optimizableHosts(e as any).sort().join(); t(`CONFIG AGREES with the rule (${Object.values(e)[0] ?? "no storage"}): next.config.js approves exactly ${ruleHosts}`, cfgHosts === ruleHosts && c.images.remotePatterns.every((p: any) => p.protocol === "https" && !p.port && !p.pathname)); }
  t("CONFIG: resized copies are kept for 30 days (uploads never change), and the optimiser's default sizes are not overridden (the allowed-widths list below matches them)", loadCfg({}).images.minimumCacheTTL === 60 * 60 * 24 * 30 && !loadCfg({}).images.deviceSizes && !loadCfg({}).images.imageSizes);

  // ===== resized addresses (map popups) =====
  const q = (src: string, w: number, ql?: number) => optimizedUrl(src, w, ql, env);
  t("ADDRESS: exact format /_next/image?url=<encoded>&w=<width>&q=<quality>", q(`${STORE}/a.webp`, 384) === `/_next/image?url=${encodeURIComponent(`${STORE}/a.webp`)}&w=384&q=75`);
  t("ADDRESS: widths round UP to one the optimiser accepts (100→128, 384→384, 385→640, 5000→3840) — any other width is refused by Next with an error", q(`${STORE}/a.webp`, 100).includes("&w=128&") && q(`${STORE}/a.webp`, 385).includes("&w=640&") && q(`${STORE}/a.webp`, 5000).includes("&w=3840&") && [1, 17, 383, 641, 1081, 3000].every((w) => OPTIMIZER_WIDTHS.includes(Number(/&w=(\d+)&/.exec(q(`${STORE}/a.webp`, w))![1]))));
  t("ADDRESS: quality is clamped to 1–100", q(`${STORE}/a.webp`, 384, 0).endsWith("&q=1") && q(`${STORE}/a.webp`, 384, 500).endsWith("&q=100"));
  t("ADDRESS: characters in the picture's own address (& ? #) are encoded so they can't change the request", (() => { const u = q("https://images.unsplash.com/photo-1?q=80&w=2000#x", 384); return u.startsWith("/_next/image?url=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1%3Fq%3D80%26w%3D2000%23x&w=384") && (u.match(/&w=/g) ?? []).length === 1; })());
  t("ADDRESS: a picture that can't be optimised comes back unchanged (never a broken link)", q("https://example.com/pic.jpg", 384) === "https://example.com/pic.jpg" && q("", 384) === "");

  // ===== source scans =====
  const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === "node_modules" || e.name === ".next" ? [] : walk(path.join(d, e.name))) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []));
  const files = [...walk("app"), ...walk("components"), ...walk("lib")].map((f) => f.replace(/\\/g, "/")); /* forward slashes on every system: Windows paths use backslashes */ const src = (f: string) => fs.readFileSync(f, "utf8"); const isClient = (s: string) => /^\s*(\/\/.*\r?\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(s);
  const withImage = files.filter((f) => /<Image\b/.test(src(f))); const bare: string[] = []; const clientHeavy: string[] = [];
  for (const f of withImage) { const s = src(f); const els = s.match(/<Image\b[\s\S]*?\/>/g) ?? []; for (const el of els) if (/(?<![\w=])unoptimized(?![\w=])/.test(el)) { if (isClient(s)) clientHeavy.push(f); else bare.push(f); } }
  t(`NO SERVER-RENDERED PICTURE IS STILL FORCED UNOPTIMISED (${withImage.length} files use <Image>; bare 'unoptimized' left on a server component: ${bare.length ? bare.join(", ") : "none"})`, bare.length === 0);
  t(`the only forced-unoptimised picture left is in a client component, which can't ask the server-side rule (${[...new Set(clientHeavy)].join(", ")}) — the 80 px cart thumbnail`, [...new Set(clientHeavy)].sort().join() === "app/shop/cart/page.tsx");
  const users = files.filter((f) => /canOptimize\(/.test(src(f)) && f !== "lib/image-src.ts"); t(`every file that decides per picture imports the rule (${users.length} files)`, users.length >= 20 && users.every((f) => /from "@\/lib\/image-src"/.test(src(f))));
  t("🔒 HYDRATION SAFETY: the rule reads a server-side setting, so NO client component may import it (the server and the browser would disagree about the same picture)", files.filter((f) => isClient(src(f)) && /@\/lib\/image-src/.test(src(f))).length === 0 && !isClient(src("lib/image-src.ts")));
  t("the map page hands the map's list a resized 384 px picture (the thumbnail is 80 px wide), and stays a server component so the size rule can run", /optimizedUrl\(i\.image, 384\)/.test(src("app/map/page.tsx")) && !isClient(src("app/map/page.tsx")));

  // ===== what a visitor is actually sent =====
  const Card = (await import("@/components/marketplace/ProductCard")).default as any; const render = (image: string) => renderToStaticMarkup(<Card product={{ id: "1", slug: "polo", name: "Polo", category: "APPAREL", price: 2500, inventory: 5, image }} />);
  process.env.S3_PUBLIC_URL = STORE;
  const up = render(`${STORE}/images/product/202610/abc.webp`), ext = render("https://example.com/pasted.jpg"), uns = render("https://images.unsplash.com/photo-1?q=80");
  t("RENDER: an uploaded picture is served through the optimiser, with a srcset of resized widths (so a phone gets a small file, not the stored 2000 px one)", /src="\/_next\/image\?url=/.test(up) && /srcSet="[^"]*\/_next\/image\?url=[^"]*&amp;w=\d+&amp;q=75 \d+w/.test(up) && /sizes="\(min-width: 1024px\) 25vw/.test(up) && !/src="https:\/\/cdn\.visittaita\.co\.ke/.test(up));
  t("RENDER: the srcset offers several widths up to the display size the markup declares", (up.match(/&amp;w=(\d+)&amp;q=75 \d+w/g) ?? []).length >= 6);
  t("RENDER: a pasted link to some other website is still shown exactly as before — the raw address, no optimiser, no srcset (it would fail to load through the optimiser)", /src="https:\/\/example\.com\/pasted\.jpg"/.test(ext) && !/_next\/image/.test(ext) && !/srcSet/.test(ext));
  t("RENDER: an Unsplash picture goes through the optimiser", /src="\/_next\/image\?url=https%3A%2F%2Fimages\.unsplash\.com/.test(uns));
  delete process.env.S3_PUBLIC_URL; const up2 = render(`${STORE}/images/product/202610/abc.webp`); t("RENDER: with storage unconfigured an upload URL is shown as it always was (nothing breaks)", /src="https:\/\/cdn\.visittaita\.co\.ke/.test(up2) && !/_next\/image/.test(up2));

  // ===== how much smaller (a simulation of what the optimiser does, on a synthetic photo) =====
  { let ratio640 = 1, ratio384 = 1, note = "sharp not available"; try { const sharp = (await import("sharp")).default; const W = 2400, H = 1600; const raw = Buffer.alloc(W * H * 3); let s = 12345; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { s = (s * 1103515245 + 12345) & 0x7fffffff; const i = (y * W + x) * 3; const n = (s >> 8) & 63; const tex = 25 * Math.sin(x / 3.1) * Math.sin(y / 2.7) + 18 * Math.sin((x * y) / 9000); raw[i] = (120 + 90 * Math.sin(x / 190) + n + tex) & 255; raw[i + 1] = (130 + 80 * Math.sin(y / 140 + x / 400) + n + tex) & 255; raw[i + 2] = (90 + 70 * Math.cos((x + y) / 260) + n - tex) & 255; }
      const stored = await sharp(raw, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 86 }).toBuffer(); const at = async (w: number) => (await sharp(stored).resize({ width: w }).webp({ quality: 75 }).toBuffer()).length; ratio640 = (await at(640)) / stored.length; ratio384 = (await at(384)) / stored.length; note = `stored ${(stored.length / 1024).toFixed(0)} KB → 640 px ${((ratio640 * stored.length) / 1024).toFixed(0)} KB (${(ratio640 * 100).toFixed(0)}%), 384 px ${((ratio384 * stored.length) / 1024).toFixed(0)} KB (${(ratio384 * 100).toFixed(0)}%)`; } catch (e) { note = "ERR " + (e as Error).message; ratio640 = 1; }
    console.log("   size simulation:", note); t(`SIZE (simulation, synthetic photo — not your real pictures): a 640 px copy is under a third of the stored 2400 px file, and a 384 px copy is smaller still; the exact saving on real photos will differ (${note})`, ratio640 < 0.34 && ratio384 < ratio640); }

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} IMAGE OPTIMISATION CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
