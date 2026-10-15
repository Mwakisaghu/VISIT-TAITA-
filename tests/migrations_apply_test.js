// Applies EVERY migration in the repository, in order, to an empty real PostgreSQL (PGlite), then inspects the result.
const fs = require("fs"), path = require("path");
const { PGlite } = require("@electric-sql/pglite");
const root = process.argv[2] || process.cwd();
(async () => {
  const db = new PGlite(); const dir = path.join(root, "prisma/migrations");
  const names = fs.readdirSync(dir).filter((n) => fs.existsSync(path.join(dir, n, "migration.sql"))).sort();
  let failed = 0; const res = [];
  const t = (n, ok, extra = "") => res.push([n, !!ok, extra]);
  for (const n of names) { try { await db.exec(fs.readFileSync(path.join(dir, n, "migration.sql"), "utf8")); } catch (e) { failed++; console.log(`MIGRATION FAILED: ${n}\n   ${String(e.message).split("\n")[0]}`); } }
  t(`all ${names.length} migrations apply, in order, to an empty real PostgreSQL`, failed === 0, failed ? `${failed} failed` : "");
  const q = async (sql, p = []) => (await db.query(sql, p)).rows;
  const tables = (await q(`select table_name from information_schema.tables where table_schema='public'`)).map((r) => r.table_name);
  const enums = (await q(`select typname from pg_type where typtype='e'`)).map((r) => r.typname);
  const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8").replace(/\/\/[^\n]*/g, "");
  const models = [...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]); const senums = [...schema.matchAll(/^enum (\w+) \{/gm)].map((m) => m[1]);
  t(`every model in the schema is a table (${models.length}) and nothing else is`, models.every((m) => tables.includes(m)) && tables.filter((x) => x !== "_prisma_migrations").every((x) => models.includes(x)), `${models.filter((m) => !tables.includes(m)).join(",")} missing`);
  t(`every enum in the schema exists (${senums.length}) and nothing else does`, senums.every((e) => enums.includes(e)) && enums.every((e) => senums.includes(e)), `${senums.filter((e) => !enums.includes(e)).join(",")} missing`);
  // columns: each scalar field of each model is a column of the table (skip relations and the model-level attributes)
  const scalar = new Set(["String", "Int", "Boolean", "DateTime", "Float", "Json", "BigInt", "Decimal", "Bytes", ...senums]);
  let colProblems = [];
  for (const m of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const cols = (await q(`select column_name from information_schema.columns where table_schema='public' and table_name=$1`, [m[1]])).map((r) => r.column_name);
    for (const line of m[2].split("\n")) { const f = /^\s+(\w+)\s+(\w+)(\[\])?(\?)?/.exec(line); if (!f || f[1].startsWith("@")) continue; if (scalar.has(f[2]) && !f[3] && !cols.includes(f[1])) colProblems.push(`${m[1]}.${f[1]}`); }
  }
  t("every scalar field of every model is a real column", colProblems.length === 0, colProblems.slice(0, 5).join(", "));
  const want = process.argv[3] ? process.argv[3].split(",") : [];
  // behaviour of the hand-written ones: constraints really enforce what the schema says
  const has = async (sql) => (await q(sql)).length > 0;
  if (tables.includes("Ticket")) {
    t("TICKETS: ticket number unique within an event, the QR token unique, a payment code unique per event and per reservation (all enforced by the database)", await has(`select 1 from pg_indexes where indexname='Ticket_eventId_number_key'`) && await has(`select 1 from pg_indexes where indexname='Ticket_secret_key'`) && await has(`select 1 from pg_indexes where indexname='TicketPayment_eventId_reference_key'`) && await has(`select 1 from pg_indexes where indexname='TicketPayment_eventId_groupId_key'`));
    await db.exec(`insert into "User"(id,name,email,"passwordHash","updatedAt") values ('u1','A','a@x.co','x',now())`).catch(() => {});
    let ok = true, why = "";
    try {
      await db.exec(`insert into "Event"(id,slug,name,program,"eventDate",location,blurb,"updatedAt") values ('e1','e1','E','TAITA_CUP',now(),'L','B',now())`);
      await db.exec(`insert into "Ticket"(id,"eventId","groupId",number,secret,"holderName","holderPhone",status,price) values ('t1','e1','g','SHR-0001','s1','x','1','VALID',0)`);
      let dupNum = false; try { await db.exec(`insert into "Ticket"(id,"eventId","groupId",number,secret,"holderName","holderPhone",status,price) values ('t2','e1','g','SHR-0001','s2','x','1','VALID',0)`); } catch { dupNum = true; }
      let dupSecret = false; try { await db.exec(`insert into "Ticket"(id,"eventId","groupId",number,secret,"holderName","holderPhone",status,price) values ('t3','e1','g','SHR-0003','s1','x','1','VALID',0)`); } catch { dupSecret = true; }
      await db.exec(`insert into "TicketPayment"(id,"eventId","groupId",reference,amount) values ('p1','e1','g','QGH7ABC123',1500)`);
      let dupRef = false; try { await db.exec(`insert into "TicketPayment"(id,"eventId","groupId",reference,amount) values ('p2','e1','g2','QGH7ABC123',1500)`); } catch { dupRef = true; }
      let dupGroup = false; try { await db.exec(`insert into "TicketPayment"(id,"eventId","groupId",reference,amount) values ('p3','e1','g','QGH7OTHER1',1500)`); } catch { dupGroup = true; }
      let delEvent = false; try { await db.exec(`delete from "Event" where id='e1'`); } catch { delEvent = true; }
      ok = dupNum && dupSecret && dupRef && dupGroup && delEvent; why = `dupNumber:${dupNum} dupSecret:${dupSecret} dupCode:${dupRef} dupGroup:${dupGroup} eventWithTicketsProtected:${delEvent}`;
    } catch (e) { ok = false; why = String(e.message).split("\n")[0]; }
    t("TICKETS (live test): a duplicate number, a duplicate QR token, a reused payment code and a second payment row for one reservation are all REFUSED by the database, and an event with tickets cannot be deleted", ok, why);
  }
  if (tables.includes("HostPayout")) {
    let ok = true, why = "";
    try {
      await db.exec(`insert into "User"(id,name,email,"passwordHash","updatedAt") values ('h1','H','h@x.co','x',now())`);
      await db.exec(`insert into "HostPayout"(id,"hostId","grossAmount","commissionPercent","commissionAmount",amount,"bookingCount",destination) values ('hp1','h1',100,10,10,90,1,'254700000000')`);
      const st = (await q(`select status from "HostPayout" where id='hp1'`))[0].status; let delHost = false; try { await db.exec(`delete from "User" where id='h1'`); } catch { delHost = true; }
      ok = st === "PENDING" && delHost; why = `defaultStatus:${st} hostWithPayoutsProtected:${delHost}`;
    } catch (e) { ok = false; why = String(e.message).split("\n")[0]; }
    t("PAYOUTS (live test): a payout starts PENDING and a host who has payouts cannot be deleted (the database refuses)", ok, why);
  }
  for (const w of want) t(`required table exists: ${w}`, tables.includes(w));
  let bad = 0; for (const [n, ok, extra] of res) { console.log((ok ? "PASS " : "FAIL ") + n + (ok || !extra ? "" : `  [${extra}]`)); if (!ok) bad++; }
  console.log(bad ? `\n${bad} FAILED` : `\nALL ${res.length} MIGRATION CHECKS PASSED  (${names.length} migrations, ${tables.length} tables, ${enums.length} enums)`); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error("ERROR:", e); process.exit(2); });
