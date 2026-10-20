#!/usr/bin/env node
// Runs the test suite in tests/: every file that ends in _test.tsx or _test.js, a few at a time, each in its own process, from the repository root.
//   npm test                      run everything
//   npm test -- spam csp          run only the files whose name contains "spam" or "csp"
//   npm test -- --jobs 2          run two at a time (the default is the smaller of 4 and the number of processors)
// A file passes if it exits normally and prints its "ALL n ... PASSED" line. Anything else is shown in full. Exits with an error if any file fails (this is what CI uses).
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd(); const dir = path.join(root, "tests");
const args = process.argv.slice(2); const j = args.indexOf("--jobs");
const jobs = Math.max(1, j >= 0 ? Number(args[j + 1]) || 1 : Math.min(4, os.cpus().length));
const filters = args.filter((a, i) => !a.startsWith("--") && !(j >= 0 && i === j + 1));
// A test is stopped after 3 minutes. On a slow computer: TEST_TIMEOUT_MS=600000 node scripts/run-tests.mjs
const TIMEOUT_MS = Number(process.env.TEST_TIMEOUT_MS) > 0 ? Number(process.env.TEST_TIMEOUT_MS) : 180_000; const tsx = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");

if (!fs.existsSync(dir)) { console.error("ERROR: there is no tests/ folder here. Run this from the repository root."); process.exit(1); }
if (!fs.existsSync(tsx)) { console.error("ERROR: dependencies are not installed. Run: npm ci"); process.exit(1); }
const files = fs.readdirSync(dir).filter((f) => /_test\.(tsx|js)$/.test(f)).filter((f) => !filters.length || filters.some((x) => f.includes(x))).sort();
if (!files.length) { console.error("No test files match " + JSON.stringify(filters)); process.exit(1); }

function runOne(file) {
  return new Promise((resolve) => {
    const full = path.join("tests", file); const argv = file.endsWith(".tsx") ? [tsx, full] : [full, "."];
    const started = Date.now(); let out = ""; const child = spawn(process.execPath, argv, { cwd: root, env: process.env });
    const timer = setTimeout(() => { out += "\nTIMED OUT after " + TIMEOUT_MS / 1000 + " seconds\n"; child.kill("SIGKILL"); }, TIMEOUT_MS);
    child.stdout.on("data", (d) => (out += d)); child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => { clearTimeout(timer); const m = /ALL (\d+) .*PASSED/.exec(out); resolve({ file, ok: code === 0 && !!m, checks: m ? Number(m[1]) : 0, out, secs: ((Date.now() - started) / 1000).toFixed(1) }); });
  });
}

const results = []; let next = 0;
await Promise.all(Array.from({ length: Math.min(jobs, files.length) }, async () => {
  while (next < files.length) { const r = await runOne(files[next++]); results.push(r); console.log(`${r.ok ? "ok  " : "FAIL"}  ${r.file.padEnd(34)} ${r.ok ? String(r.checks).padStart(3) + " checks" : ""}  (${r.secs}s)`); }
}));

const bad = results.filter((r) => !r.ok).sort((a, b) => a.file.localeCompare(b.file));
for (const r of bad) { console.log(`\n----- ${r.file} -----`); const lines = r.out.split("\n").filter((l) => /^(FAIL|ERROR|\d+ FAILED|TIMED OUT)/.test(l) || /Error:/.test(l)); console.log((lines.length ? lines : r.out.trim().split("\n").slice(-15)).slice(0, 25).join("\n")); }
const checks = results.reduce((n, r) => n + r.checks, 0);
console.log(`\n${results.length - bad.length} of ${results.length} test files passed (${checks} checks).` + (bad.length ? `  ${bad.length} FAILED: ${bad.map((r) => r.file).join(", ")}` : ""));
process.exit(bad.length ? 1 : 0);
