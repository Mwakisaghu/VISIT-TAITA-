#!/usr/bin/env node
// Repository safety checks. Catches the mistakes that have actually happened here, before they reach GitHub:
//   - merge-conflict markers committed into source files (the site stops building)
//   - secrets and personal details committed (database passwords, API keys, private keys, a real email in .env.example)
//   - environment files, key files and similar that must never be tracked
//   - a "use server" file exporting something other than an async function (Next.js refuses to compile it; the type-checker can't see it)
//   - settings the code reads that .env.example doesn't mention (so nobody knows to set them)
//   - the Prisma schema and the migrations disagreeing (the live database would be missing columns)
//   - .gitignore not covering environment and key files
//
//   node scripts/check-repo.mjs                  everything, on the files in the repository  (CI runs this)
//   node scripts/check-repo.mjs --staged         only the quick checks, on what is staged     (the commit hook runs this)
//   node scripts/check-repo.mjs --history        also scan every past commit for secrets (informational, slow)
//   node scripts/check-repo.mjs --root <folder>  check another checkout
//   node scripts/check-repo.mjs --install-hooks  point git at .githooks (runs on npm install; never fails)
//
// It NEVER prints the value of a secret — only the file, the line and what kind of thing it looks like.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const rootAt = args.indexOf("--root");
const ROOT = rootAt >= 0 ? path.resolve(args[rootAt + 1]) : process.cwd();
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });

if (has("--install-hooks")) {
  try {
    if (fs.existsSync(path.join(ROOT, ".git")) && fs.existsSync(path.join(ROOT, ".githooks"))) execFileSync("git", ["config", "core.hooksPath", ".githooks"], { cwd: ROOT, stdio: "ignore" });
  } catch { /* not a git checkout (e.g. a hosting build): nothing to do, and never a reason to fail an install */ }
  process.exit(0);
}

const STAGED = has("--staged");
const list = (out) => out.split("\0").filter(Boolean);
const files = STAGED ? list(git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z")) : list(git("ls-files", "-z"));
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|pdf|docx?|xlsx?|pptx?|zip|gz|mp4|mov|mp3)$/i;
const NOT_SCANNED = /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$|\.svg$/i;
const read = (f) => {
  try {
    if (STAGED) return git("show", `:${f}`);
    const p = path.join(ROOT, f);
    if (fs.statSync(p).size > 1_500_000) return "";
    return fs.readFileSync(p, "utf8");
  } catch { return ""; }
};
const text = (f) => !BINARY.test(f);

const checks = [];
const add = (title, problems) => checks.push({ title, problems });

// 1 -------------------------------------------------------------------- conflict markers
{
  const out = [];
  for (const f of files) {
    if (!text(f) || /\.(md|sh)$/i.test(f)) continue; // documents and scripts may quote the markers
    read(f).split("\n").forEach((l, i) => { if (/^(<<<<<<<|>>>>>>>)( |\s*$)/.test(l)) out.push(`${f}:${i + 1}  merge-conflict marker`); });
  }
  add("No merge-conflict markers in source files", out);
}

// 2 -------------------------------------------------------------------- files that must never be tracked
{
  const bad = /(^|\/)\.env($|\.(?!example$).+)|\.(pem|key|p12|pfx)$|(^|\/)id_(rsa|dsa|ecdsa|ed25519)|(^|\/)secrets?\.(json|ya?ml)$|(^|\/)\.vercel\/|(^|\/)\.netlify\//i;
  add("No environment files, keys or credentials are tracked", files.filter((f) => bad.test(f)).map((f) => `${f}  must not be committed`));
}

// 3 -------------------------------------------------------------------- secrets and personal details
const PLACEHOLDER = /(localhost|127\.0\.0\.1|example|your[-_ ]|change[-_ ]?me|xxxx|user:password|<[a-z]|replace|generate|openssl|placeholder|dummy|\btest|fake|sample|\.\.\.|process\.env|abc123|secret-here|\$\{)/i;
export const SECRET_PATTERNS = {
  "database address with a password": /postgres(?:ql)?:\/\/[^\s"'/:@]+:[^\s"'/@]{3,}@[^\s"'/:?]+/,
  "Resend API key": /\bre_[A-Za-z0-9]{20,}\b/,
  "AWS access key id": /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
  "private key": /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY/,
  "GitHub token": /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  "Google API key": /\bAIza[0-9A-Za-z_-]{35}\b/,
  "Slack token": /\bxox[baprs]-[0-9A-Za-z-]{10,}/,
  "live payment secret": /\b(?:sk|rk)_live_[0-9A-Za-z]{16,}/,
  "Neon / Vercel / Supabase token": /\b(?:npg_|vercel_|sbp_)[A-Za-z0-9]{16,}/,
  "long secret-looking value": /\b[A-Z][A-Z0-9_]*(?:SECRET|PASSKEY|PASSWORD|TOKEN|API_KEY|PRIVATE_KEY|CONSUMER_KEY|ACCESS_KEY)[A-Z0-9_]*\s*[:=]\s*["'][A-Za-z0-9+/=_.-]{20,}["']/,
  "personal email address": /\b[A-Za-z0-9._%+-]+@(?:gmail|yahoo|outlook|hotmail|icloud|proton(?:mail)?)\.(?:com|me)\b/,
};
export function looksReal(kind, line, match) {
  if (kind === "personal email address") return !/(example|test|noreply|no-reply|admin@|info@)/i.test(match);
  return !(PLACEHOLDER.test(match) || PLACEHOLDER.test(line.slice(0, 200)));
}
{
  const out = [];
  for (const f of files) {
    if (!text(f) || NOT_SCANNED.test(f) || /^scripts\/check-repo\.mjs$/.test(f)) continue;
    read(f).split("\n").forEach((l, i) => {
      for (const [kind, rx] of Object.entries(SECRET_PATTERNS)) { const m = rx.exec(l); if (m && looksReal(kind, l, m[0])) out.push(`${f}:${i + 1}  looks like a ${kind} (value not shown)`); }
    });
  }
  // .env.example is a template: any setting that holds a secret must be blank or an obvious placeholder, and no real address belongs in it.
  if (files.includes(".env.example")) {
    read(".env.example").split("\n").forEach((l, i) => {
      const m = /^([A-Z][A-Z0-9_]*)\s*=\s*"([^"]+)"/.exec(l);
      if (m && /(SECRET|PASSWORD|PASSKEY|TOKEN|API_KEY|PRIVATE|ACCESS_KEY|DATABASE_URL)/.test(m[1]) && !PLACEHOLDER.test(m[2])) out.push(`.env.example:${i + 1}  ${m[1]} holds a real-looking value; it must be blank (value not shown)`);
      const e = /^([A-Z][A-Z0-9_]*)\s*=\s*"[^"]*@[^"]*\.[a-z]{2,}"/i.exec(l);
      if (e && !PLACEHOLDER.test(l) && !/(resend\.dev)/.test(l)) out.push(`.env.example:${i + 1}  ${e[1]} holds a real-looking email address; use a placeholder (value not shown)`);
    });
  }
  add("No secrets or personal details in tracked files", [...new Set(out)]);
}

// 4..7 are full-repository checks (skipped by the quick commit hook)
if (!STAGED) {
  // 4 -------------------------------------------------------------------- "use server" files export only async functions
  {
    const out = []; let n = 0;
    for (const f of files.filter((x) => /\.(ts|tsx)$/.test(x))) {
      const s = read(f);
      if (!/^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use server["']/.test(s)) continue;
      n++;
      for (const m of s.matchAll(/^export\s+(?!async\s+function|type\s|interface\s)(\w+)\s+(\w+)/gm)) out.push(`${f}  exports ${m[1]} ${m[2]} — a "use server" file may only export async functions and types`);
      if (/^export\s*\{/m.test(s)) out.push(`${f}  has an export { … } block — a "use server" file may only export async functions and types`);
    }
    add(`"use server" files export only async functions (${n} checked)`, out);
  }

  // 5 -------------------------------------------------------------------- every setting the code reads is documented
  {
    const SYSTEM = new Set("NODE_ENV NEXT_RUNTIME NEXT_PHASE CI PORT TZ VERCEL VERCEL_URL VERCEL_ENV VERCEL_PROJECT_PRODUCTION_URL NEXT_PUBLIC_VERCEL_URL NETLIFY URL DEPLOY_URL DEPLOY_PRIME_URL __NEXT_IMAGE_OPTS".split(" "));
    const doc = new Set([...(read(".env.example").matchAll(/^#?\s*([A-Z][A-Z0-9_]+)\s*=/gm))].map((m) => m[1]));
    const used = new Map();
    for (const f of files.filter((x) => /^(app|lib|components|scripts|prisma)\/.*\.(ts|tsx|js|mjs)$/.test(x) && x !== "scripts/check-repo.mjs")) {
      for (const m of read(f).matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) if (!used.has(m[1])) used.set(m[1], f);
    }
    add("Every setting the code reads is documented in .env.example", [...used].filter(([k]) => !doc.has(k) && !SYSTEM.has(k)).map(([k, f]) => `${k}  is read in ${f} but not mentioned in .env.example`));
  }

  // 6 -------------------------------------------------------------------- the schema and the migrations agree
  {
    const out = migrationProblems();
    add("The Prisma schema and the migrations agree", out);
  }

  // 7 -------------------------------------------------------------------- .gitignore covers environment and key files
  {
    const must = [".env", ".env.local", ".env.production", ".env.development", ".env.staging", ".env.test", ".env.production.local", "server.pem", "private.key", "id_rsa", "secrets.json", ".vercel", "public/uploads/x.webp"];
    const out = [];
    for (const n of must) { try { git("check-ignore", "-q", "--no-index", "--", n); } catch { out.push(`.gitignore does not cover ${n}`); } }
    add(".gitignore covers environment files, keys and local uploads", out);
  }
}

export function migrationProblems() {
  const sp = path.join(ROOT, "prisma/schema.prisma");
  if (!fs.existsSync(sp)) return [];
  const schema = fs.readFileSync(sp, "utf8").replace(/\/\/[^\n]*/g, "");
  const dupes = []; // Prisma refuses two models/enums with one name; the plain parsing below would silently let the second overwrite the first
  { const seen = new Set(); for (const m of schema.matchAll(/^(?:model|enum) (\w+) \{/gm)) { if (seen.has(m[1])) dupes.push(`${m[1]} is defined more than once in the schema (two models or enums can't share a name)`); seen.add(m[1]); } }
  const enums = {};
  for (const m of schema.matchAll(/^enum (\w+) \{([\s\S]*?)^\}/gm)) enums[m[1]] = [...m[2].matchAll(/^\s*([A-Za-z0-9_]+)\s*(?:@map\([^)]*\))?\s*$/gm)].map((x) => x[1]);
  const SC = new Set(["String", "Int", "Float", "Boolean", "DateTime", "Json", "Decimal", "BigInt", "Bytes"]);
  const want = {};
  for (const m of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const table = (/@@map\("([^"]+)"\)/.exec(m[2]) || [])[1] || m[1]; const cols = new Set();
    for (let line of m[2].split("\n")) {
      line = line.trim(); if (!line || line.startsWith("@@")) continue;
      const f = /^(\w+)\s+(\w+)(\[\])?(\?)?/.exec(line);
      if (f && (SC.has(f[2]) || enums[f[2]])) cols.add((/@map\("([^"]+)"\)/.exec(line) || [])[1] || f[1]);
    }
    want[table] = cols;
  }
  const dir = path.join(ROOT, "prisma/migrations");
  const migs = fs.existsSync(dir) ? fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, "migration.sql"))).sort() : [];
  if (migs.length === 0) return ["There are no migrations (prisma/migrations) — the live database could not be built from this repository"];
  const db = {}, dbEnum = {};
  for (const mig of migs) {
    const sql = fs.readFileSync(path.join(dir, mig, "migration.sql"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
    for (const st of sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
      let m;
      if ((m = /^CREATE TYPE\s+"(\w+)"\s+AS ENUM\s*\(([\s\S]*)\)/.exec(st))) { if (dbEnum[m[1]]) dupes.push(`enum ${m[1]} is created by more than one migration`); dbEnum[m[1]] = [...m[2].matchAll(/'([^']*)'/g)].map((x) => x[1]); continue; }
      if ((m = /^ALTER TYPE\s+"(\w+)"\s+ADD VALUE\s+(?:IF NOT EXISTS\s+)?'([^']*)'/.exec(st))) { (dbEnum[m[1]] ||= []).push(m[2]); continue; }
      if ((m = /^ALTER TYPE\s+"(\w+)"\s+RENAME TO\s+"(\w+)"/.exec(st)) && dbEnum[m[1]]) { dbEnum[m[2]] = dbEnum[m[1]]; delete dbEnum[m[1]]; continue; }
      if ((m = /^DROP TYPE\s+(?:IF EXISTS\s+)?"(\w+)"/.exec(st))) { delete dbEnum[m[1]]; continue; }
      if ((m = /^CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"(\w+)"\s*\(([\s\S]*)\)\s*$/.exec(st))) { if (db[m[1]]) dupes.push(`table ${m[1]} is created by more than one migration`); db[m[1]] = new Set(m[2].split("\n").map((l) => /^\s*"(\w+)"\s+["A-Za-z]/.exec(l)?.[1]).filter(Boolean)); continue; }
      if ((m = /^DROP TABLE\s+(?:IF EXISTS\s+)?"(\w+)"/.exec(st))) { delete db[m[1]]; continue; }
      if ((m = /^ALTER TABLE\s+"(\w+)"\s+RENAME TO\s+"(\w+)"/.exec(st)) && db[m[1]]) { db[m[2]] = db[m[1]]; delete db[m[1]]; continue; }
      if ((m = /^ALTER TABLE\s+(?:ONLY\s+)?"(\w+)"\s+([\s\S]*)/.exec(st)) && db[m[1]]) {
        for (const a of m[2].matchAll(/ADD COLUMN\s+(?:IF NOT EXISTS\s+)?"(\w+)"/g)) db[m[1]].add(a[1]);
        for (const a of m[2].matchAll(/DROP COLUMN\s+(?:IF EXISTS\s+)?"(\w+)"/g)) db[m[1]].delete(a[1]);
        for (const a of st.matchAll(/RENAME COLUMN\s+"(\w+)"\s+TO\s+"(\w+)"/g)) { db[m[1]].delete(a[1]); db[m[1]].add(a[2]); }
      }
    }
  }
  const out = [];
  for (const [t, cols] of Object.entries(want)) {
    if (!db[t]) { out.push(`table ${t} is in the schema but no migration creates it`); continue; }
    for (const c of cols) if (!db[t].has(c)) out.push(`column ${t}.${c} is in the schema but no migration adds it`);
    for (const c of db[t]) if (!cols.has(c)) out.push(`column ${t}.${c} is created by a migration but not in the schema`);
  }
  for (const t of Object.keys(db)) if (!want[t] && !t.startsWith("_")) out.push(`table ${t} is created by a migration but not in the schema`);
  for (const [e, vals] of Object.entries(enums)) {
    if (!dbEnum[e]) { out.push(`enum ${e} is in the schema but no migration creates it`); continue; }
    for (const v of vals) if (!dbEnum[e].includes(v)) out.push(`enum value ${e}.${v} is in the schema but no migration adds it`);
    for (const v of dbEnum[e]) if (!vals.includes(v)) out.push(`enum value ${e}.${v} is in a migration but not in the schema`);
  }
  for (const e of Object.keys(dbEnum)) if (!enums[e]) out.push(`enum ${e} is created by a migration but not in the schema`);
  return [...dupes, ...out];
}

// --history: informational scan of every added line in every commit ----------------------------------------------------
async function historyScan() {
  console.log("\nScanning every commit for secrets (this can take a minute)…");
  const p = spawn("git", ["log", "--all", "-p", "--no-color", "--no-merges", "--format=@@COMMIT %h %ad", "--date=short"], { cwd: ROOT });
  const rl = readline.createInterface({ input: p.stdout });
  let commit = "", file = ""; const found = new Map();
  for await (const line of rl) {
    if (line.startsWith("@@COMMIT ")) { commit = line.slice(9); continue; }
    if (line.startsWith("+++ b/")) { file = line.slice(6); continue; }
    if (!line.startsWith("+") || line.startsWith("+++") || BINARY.test(file) || NOT_SCANNED.test(file) || file === "scripts/check-repo.mjs") continue;
    for (const [kind, rx] of Object.entries(SECRET_PATTERNS)) { const m = rx.exec(line); if (m && looksReal(kind, line, m[0])) { found.set(`${kind}|${file}`, commit); /* the log runs newest to oldest, so the last write is the EARLIEST commit */ } }
  }
  if (found.size === 0) console.log("  nothing found in history.");
  else {
    console.log("  Found in history (anything real here is exposed to anyone who can read the repository: change that password/key, then consider rewriting history):");
    for (const [k, c] of found) { const [kind, f] = k.split("|"); console.log(`   - ${kind} in ${f}, first seen in commit ${c.split(" ")[0]} (${c.split(" ")[1]})`); }
  }
}

// report ----------------------------------------------------------------------------------------------------------------
let failed = 0;
console.log(STAGED ? "Checking what you are about to commit…" : "Checking the repository…");
for (const c of checks) {
  if (c.problems.length === 0) console.log(`  ok    ${c.title}`);
  else { failed++; console.log(`  FAIL  ${c.title}`); for (const p of c.problems.slice(0, 25)) console.log(`          ${p}`); if (c.problems.length > 25) console.log(`          … and ${c.problems.length - 25} more`); }
}
if (has("--history")) await historyScan();
if (failed) { console.log(`\n${failed} check${failed === 1 ? "" : "s"} failed.`); process.exit(1); }
console.log("\nAll checks passed.");
