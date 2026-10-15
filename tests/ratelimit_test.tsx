import fs from "fs"; import path from "path";
const { PGlite } = require("@electric-sql/pglite");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function main() {
  const pg = new PGlite();
  await pg.exec(fs.readFileSync("prisma/migrations/20261010090000_add_rate_limit_buckets/migration.sql", "utf8"));
  // the REAL prismaStore code, with the database driver replaced by real PostgreSQL (the SQL strings, parameter order and result mapping are all the shipped ones)
  (globalThis as any).prisma = { $queryRawUnsafe: async (sql: string, ...p: any[]) => (await pg.query(sql, p)).rows, $executeRawUnsafe: async (sql: string, ...p: any[]) => (await pg.query(sql, p)).affectedRows ?? 0 };
  const S = await import("@/lib/rate-limit-store"); const L = await import("@/lib/rate-limit"); const LT = await import("@/lib/login-throttle");
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const store = S.prismaStore; const rows = async () => (await pg.query(`select * from "RateLimitBucket"`)).rows as any[];
  const wipe = async () => { await pg.exec(`delete from "RateLimitBucket"`); };
  const counted = (s: any) => { const c = { hit: 0, peek: 0, clear: 0 }; return { c, store: { hit: async (...a: any[]) => { c.hit++; return s.hit(...a); }, peek: async (...a: any[]) => { c.peek++; return s.peek(...a); }, clear: async (...a: any[]) => { c.clear++; return s.clear(...a); }, purge: () => s.purge() } as any }; };
  const warns: string[] = []; const origWarn = console.warn; console.warn = (...a: any[]) => { warns.push(a.join(" ")); };

  // ===== the SQL, on real PostgreSQL =====
  let h = await store.hit("k1", 60000); t("STORE: the first hit is count 1 and the window has about 60 s left", h.count === 1 && h.retryMs > 58000 && h.retryMs <= 60000);
  const cs = []; for (let i = 0; i < 4; i++) cs.push((await store.hit("k1", 60000)).count); t("STORE: further hits count 2, 3, 4, 5 and the window does NOT move (it ends 60 s after the FIRST hit)", cs.join() === "2,3,4,5" && (await store.hit("k1", 60000)).retryMs <= h.retryMs);
  t("STORE: different keys count separately", (await store.hit("k2", 60000)).count === 1 && (await store.hit("K1", 60000)).count === 1 && (await store.hit("k1 ", 60000)).count === 1);
  await pg.exec(`update "RateLimitBucket" set "resetsAt" = (now() at time zone 'utc') - interval '1 second'`); h = await store.hit("k1", 60000);
  t("STORE: once the window has ended the next hit starts a NEW window: count back to 1 with a fresh 60 s", h.count === 1 && h.retryMs > 58000);
  await wipe(); await store.hit("a", 60000); await store.hit("a", 60000); await store.hit("b", 60000);
  let pk = await store.peek(["a", "b", "never"]); t("PEEK: counts for live keys (a=2, b=1) and 0 for a key that was never hit — without adding a hit", pk.a === 2 && pk.b === 1 && pk.never === 0 && (await store.peek(["a"])).a === 2);
  await pg.exec(`update "RateLimitBucket" set "resetsAt" = (now() at time zone 'utc') - interval '1 second'`); pk = await store.peek(["a", "b"]); t("PEEK: an ended window counts as 0", pk.a === 0 && pk.b === 0 && Object.keys(await store.peek([])).length === 0);
  await wipe(); await store.hit("x", 60000); await store.clear("x"); t("CLEAR: removes the counter (the next hit is 1) and clearing an unknown key is harmless", (await store.hit("x", 60000)).count === 1 && (await store.clear("nobody"), true));
  await wipe(); for (const k of ["old", "recent", "live"]) await store.hit(k, 1000);
  await pg.exec(`update "RateLimitBucket" set "resetsAt" = (now() at time zone 'utc') - interval '2 days' where "key" = '${S.hashKey("old")}'`); await pg.exec(`update "RateLimitBucket" set "resetsAt" = (now() at time zone 'utc') - interval '1 hour' where "key" = '${S.hashKey("recent")}'`);
  const purged = await store.purge(); t("PURGE: deletes only buckets that ended more than a day ago (1 of 3), keeps the recent and the live ones, and reports how many", purged === 1 && (await rows()).length === 2);
  await wipe(); const many = await Promise.all(Array.from({ length: 100 }, () => store.hit("hot", 60000))); const cc = many.map((x) => x.count).sort((a, b) => a - b);
  t("🔒 ATOMIC: 100 hits on one key at the same instant -> the counts returned are exactly 1…100, none repeated or lost, and 100 is what is stored", cc.every((c, i) => c === i + 1) && (await rows())[0].count === 100);
  await wipe(); await store.hit("login:pair:jane@example.com|203.0.113.7", 60000); await store.hit("login:ip:203.0.113.7", 60000); const all = JSON.stringify(await rows());
  t("🔒 NO PERSONAL DATA: after counting a login for jane@example.com from 203.0.113.7, the table holds neither the email nor the address — only 32-character hashes", !/jane|example|203\.113|203\.0\.|@/.test(all) && (await rows()).every((r) => /^[A-Za-z0-9_-]{32}$/.test(r.key)));
  await wipe(); const nasty = ["'; DROP TABLE \"RateLimitBucket\"; --", "ключ 🔑 日本語", "x".repeat(5000), "", "a\u0000b".replace("\u0000", "")]; let nastyOk = true; for (const k of nasty) { try { const r = await store.hit(k, 1000); nastyOk = nastyOk && r.count === 1; } catch { nastyOk = false; } }
  t("INJECTION & ODD KEYS: quotes and SQL in a key, unicode, a 5,000-character key and an empty key all just work as keys, and the table is still there", nastyOk && (await rows()).length === nasty.length && (await pg.query(`select count(*)::int c from "RateLimitBucket"`)).rows[0].c === nasty.length);
  await wipe(); t("EDGE: a window of 1 ms, or 0 or negative (clamped to 1 ms), is accepted", (await store.hit("w1", 1)).count === 1 && (await store.hit("w0", 0)).count === 1 && (await store.hit("wneg", -50)).count === 1);
  for (const tz of ["Asia/Tokyo", "Pacific/Honolulu", "UTC"]) { await wipe(); await pg.exec(`SET TIME ZONE '${tz}'`); const a = await store.hit("tz", 60000); const b = await store.hit("tz", 60000); const pe = await store.peek(["tz"]); t(`TIME ZONES: with the database session set to ${tz}, windows are still exactly 60 s (not shifted by hours) and counting works`, a.count === 1 && b.count === 2 && a.retryMs > 58000 && a.retryMs <= 60000 && pe.tz === 2); }
  { await wipe(); await pg.exec(`SET TIME ZONE 'UTC'`); await store.hit("mix", 60000); await store.hit("mix", 60000); await pg.exec(`SET TIME ZONE 'Asia/Tokyo'`); const t3 = await store.hit("mix", 60000); const peekTokyo = (await store.peek(["mix"])).mix; await pg.exec(`SET TIME ZONE 'Pacific/Honolulu'`); const t4 = await store.hit("mix", 60000); await pg.exec(`SET TIME ZONE 'UTC'`);
    t("🔒 MIXED TIME ZONES: two connections counting the SAME key while set to different time zones (UTC, then Tokyo, then Honolulu) still share one window — counts continue 1, 2, 3, 4 instead of silently restarting", t3.count === 3 && peekTokyo === 3 && t4.count === 4 && t3.retryMs > 55000 && t4.retryMs > 55000); }
  await wipe();

  // ===== the limiter =====
  const mk = () => L.createLimiter(() => store);
  let A = mk(); let ok = 0; for (let i = 0; i < 8; i++) if (await A.check("one", 5, 60000)) ok++; t("LIMITER: a limit of 5 lets exactly 5 through and refuses the rest", ok === 5);
  await wipe(); A = mk(); const w = []; for (let i = 0; i < 4; i++) w.push(await A.check("win", 2, 350)); await sleep(450); const after = await A.check("win", 2, 350);
  t("LIMITER: after the window ends the key is allowed again (2 allowed, 2 refused, then allowed once the 350 ms window has passed)", w.join() === "true,true,false,false" && after === true);
  await wipe(); const servers = [mk(), mk()]; let granted = 0; for (let i = 0; i < 30; i++) if (await servers[i % 2].check("shared", 10, 60000)) granted++;
  const lone = [L.createLimiter(() => ({ hit: async () => { throw new Error("no db"); } } as any)), L.createLimiter(() => ({ hit: async () => { throw new Error("no db"); } } as any))]; let old = 0; for (let i = 0; i < 30; i++) if (await lone[i % 2].check("unshared", 10, 60000)) old++;
  t(`🔒 THE POINT — TWO SERVERS, ONE LIMIT: with a limit of 10, requests alternating between two servers let exactly ${granted} through (the old per-server counting would have let ${old} through)`, granted === 10 && old === 20);
  await wipe(); const four = [mk(), mk(), mk(), mk()]; const out = await Promise.all(Array.from({ length: 100 }, (_, i) => four[i % 4].check("storm", 30, 60000)));
  t("🔒 STORM: 100 simultaneous requests spread over 4 servers with a limit of 30 -> exactly 30 allowed", out.filter(Boolean).length === 30);
  await wipe(); const cn = counted(store); const B = L.createLimiter(() => cn.store); for (let i = 0; i < 3; i++) await B.check("flood", 3, 60000); const before = cn.c.hit; for (let i = 0; i < 200; i++) await B.check("flood", 3, 60000);
  t("FLOOD: once a key is over its limit, this server refuses further requests WITHOUT touching the database — 200 refused requests cost exactly ONE database call (the one that discovered the limit), so an attack can't hammer the database through the limiter", before === 3 && cn.c.hit === before + 1);
  await sleep(1); const C = L.createLimiter(() => cn.store); await C.check("blocktest", 1, 300); await C.check("blocktest", 1, 300); const b1 = cn.c.hit; await sleep(450); const reopened = await C.check("blocktest", 1, 300);
  t("FLOOD: the local 'blocked' memory ends with the window, so the key is allowed again afterwards", reopened === true && cn.c.hit === b1 + 1);
  // failures: the shared counters being unavailable must neither lock people out nor switch protection off
  warns.length = 0; const dead = L.createLimiter(() => ({ hit: async () => { throw new Error("connection refused"); } } as any)); const dres = []; for (let i = 0; i < 6; i++) dres.push(await dead.check("fb", 3, 60000));
  t("FALLBACK: if the database can't be reached, this server counts for itself — a limit of 3 still lets exactly 3 through and refuses the rest", dres.join() === "true,true,true,false,false,false");
  t("FALLBACK: it says so in the log ONCE (not on every request)", warns.length === 1 && /counting per server/.test(warns[0]) && /connection refused/.test(warns[0]));
  let flaky = true; const hiccup = L.createLimiter(() => ({ hit: async (k: string, ms: number) => { if (flaky) throw new Error("blip"); return store.hit(k, ms); } } as any)); const firstTry = await hiccup.check("hic", 2, 60000); flaky = false; await wipe(); const second = await hiccup.check("hic", 2, 60000); const third = await hiccup.check("hic", 2, 60000); const fourth = await hiccup.check("hic", 2, 60000);
  t("FALLBACK: when the database comes back the limiter uses it again (shared counting resumes: a fresh window counts 1, 2 then refuses)", firstTry === true && second === true && third === true && fourth === false);
  const never = L.createLimiter(() => ({ hit: async () => { throw new Error("down"); } } as any)); let wrongly = 0; for (let i = 0; i < 5; i++) if (!(await never.check(`k${i}`, 3, 60000))) wrongly++; t("FALLBACK: a database outage never refuses a request that is within its limit (5 different keys, none refused)", wrongly === 0);
  L.setRateLimitStore({ hit: async () => { throw new Error("x"); }, peek: async () => { throw new Error("x"); }, clear: async () => { throw new Error("x"); }, purge: async () => { throw new Error("purge broke"); } }); const q0 = console.error; console.error = () => {}; t("PURGE JOB: never throws, even if the database does (returns 0)", (await L.purgeExpiredRateLimits()) === 0); console.error = q0; L.setRateLimitStore(null);
  t("MEMORY: the per-server bookkeeping stays bounded (thousands of distinct keys don't grow it without limit)", await (async () => { const d = L.createLimiter(() => ({ hit: async () => { throw new Error("n"); } } as any)); for (let i = 0; i < 6500; i++) await d.check(`m${i}`, 5, 1); await sleep(5); for (let i = 0; i < 20; i++) await d.check(`n${i}`, 5, 1); return d.size().local <= 5100; })());

  // ===== the login throttle =====
  await wipe(); const T1 = LT.createLoginThrottle(() => store), T2 = LT.createLoginThrottle(() => store);
  for (let i = 0; i < 4; i++) { await T1.recordFailure("jane@example.com", "203.0.113.7"); await T2.recordFailure("jane@example.com", "203.0.113.7"); }
  t("🔒 LOGIN, TWO SERVERS: 8 wrong passwords for one person from one address, 4 on each of two servers -> BOTH servers now refuse that person (before: 8 per server, 16 guesses before any block)", (await T1.isBlocked("jane@example.com", "203.0.113.7")) && (await T2.isBlocked("jane@example.com", "203.0.113.7")));
  t("LOGIN: case doesn't matter in the email, and a different person or a different address is not blocked", (await T2.isBlocked("JANE@Example.com", "203.0.113.7")) && !(await T1.isBlocked("peter@example.com", "203.0.113.7")) && !(await T1.isBlocked("jane@example.com", "198.51.100.9")));
  await wipe(); const T3 = LT.createLoginThrottle(() => store); for (let i = 0; i < 7; i++) await T3.recordFailure("jane@example.com", "203.0.113.7"); const at7 = await T3.isBlocked("jane@example.com", "203.0.113.7"); await T3.recordFailure("jane@example.com", "203.0.113.7"); t("LOGIN: 7 failures are allowed and the 8th blocks (the same threshold as before)", at7 === false && (await T3.isBlocked("jane@example.com", "203.0.113.7")) === true);
  await T3.clearFailures("jane@example.com", "203.0.113.7"); t("LOGIN: a successful sign-in clears that person's count (unblocked again) …", (await T3.isBlocked("jane@example.com", "203.0.113.7")) === false);
  await wipe(); const T4 = LT.createLoginThrottle(() => store); for (let i = 0; i < 40; i++) await (i % 2 ? T4 : T3).recordFailure(`user${i}@example.com`, "192.0.2.50"); const ipBlocked = await T4.isBlocked("someone.new@example.com", "192.0.2.50");
  t("LOGIN: 40 failures from one address (spread across two servers, 40 different emails) block that whole address — even for a brand-new email", ipBlocked === true && !(await T4.isBlocked("someone.new@example.com", "192.0.2.51")));
  await T4.clearFailures("user3@example.com", "192.0.2.50"); t("LOGIN: … but a successful sign-in does NOT clear the address-wide count (a guesser can't reset it with a login of their own)", (await T4.isBlocked("user3@example.com", "192.0.2.50")) === true);
  await wipe(); const T5 = LT.createLoginThrottle(() => store); for (let i = 0; i < 8; i++) await T5.recordFailure("jane@example.com", "203.0.113.7"); await pg.exec(`update "RateLimitBucket" set "resetsAt" = (now() at time zone 'utc') - interval '1 second'`); t("LOGIN: after the 15-minute window passes, the block lifts", (await T5.isBlocked("jane@example.com", "203.0.113.7")) === false);
  warns.length = 0; const TD = LT.createLoginThrottle(() => ({ hit: async () => { throw new Error("db down"); }, peek: async () => { throw new Error("db down"); }, clear: async () => { throw new Error("db down"); }, purge: async () => 0 } as any)); for (let i = 0; i < 8; i++) await TD.recordFailure("jane@example.com", "203.0.113.7");
  t("LOGIN FALLBACK: with the database down, this server's own count still blocks at 8 (guessing is not unlimited during an outage), warns once, and other people are unaffected", (await TD.isBlocked("jane@example.com", "203.0.113.7")) === true && !(await TD.isBlocked("peter@example.com", "203.0.113.7")) && warns.length === 1 && /login-throttle/.test(warns[0]));
  t("LOGIN: the helper that reads the visitor's address from forwarded headers still works", LT.clientIpFrom({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }) === "203.0.113.7" && LT.clientIpFrom({}) === "unknown" && LT.clientIpFrom(undefined) === "unknown");
  console.warn = origWarn;

  // ===== the code that uses it =====
  const walk = (d: string, o: string[] = []): string[] => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === "node_modules" || e.name === ".next") continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p, o); else if (/\.tsx?$/.test(e.name)) o.push(p); } return o; };
  const src = [...walk("app"), ...walk("lib"), ...walk("components")].filter((f) => !/lib\/(rate-limit|rate-limit-store|login-throttle)\.ts$/.test(f.split(path.sep).join("/")));
  let unawaited = 0, old2 = 0, sites = 0; for (const f of src) for (const line of fs.readFileSync(f, "utf8").split("\n")) { const code = line.replace(/\/\/.*$/, ""); if (/(?<![.\w$])rateLimit\(/.test(code)) old2++; for (const m of code.matchAll(/(?<![.\w$])(checkRateLimit|isLoginBlocked|recordLoginFailure|clearLoginFailures)\(/g)) { sites++; if (!/await\s*\(?\s*$/.test(code.slice(0, m.index))) unawaited++; } }
  t(`CALL SITES: ${sites} calls across the site, every one awaited, and none left on the old synchronous function`, sites >= 44 && unawaited === 0 && old2 === 0);
  const cron = fs.readFileSync("app/api/cron/emails/route.ts", "utf8"); t("CRON: the scheduled job clears out expired counters and reports it", /purgeExpiredRateLimits/.test(cron) && /rateLimits/.test(cron));
  t("the new table is covered by a migration that matches the schema", fs.readFileSync("prisma/schema.prisma", "utf8").includes("model RateLimitBucket") && fs.existsSync("prisma/migrations/20261010090000_add_rate_limit_buckets/migration.sql"));

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} SHARED RATE-LIMIT CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
