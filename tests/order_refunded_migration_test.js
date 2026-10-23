// The running refunded total migration, on a REAL PostgreSQL (PGlite): applies every migration before it, creates orders with refunds in every state, applies it, and checks each order's total.
const { PGlite } = require("@electric-sql/pglite"); const fs = require("fs"); const path = require("path"); const res = []; const t = (n, ok) => res.push([n, !!ok]);
(async () => {
  const dir = path.join(__dirname, "..", "prisma", "migrations"); const names = fs.readdirSync(dir).filter((n) => fs.existsSync(path.join(dir, n, "migration.sql"))).sort(); const at = names.findIndex((n) => /add_order_refunded_amount$/.test(n)); const sql = (n) => fs.readFileSync(path.join(dir, n, "migration.sql"), "utf8");
  t("THE MIGRATION EXISTS and comes after the one that created the refund table", at > 0 && names.slice(0, at).some((n) => /CREATE TABLE "OrderRefund"/.test(sql(n))));
  const db = new PGlite(); for (const n of names.slice(0, at)) await db.exec(sql(n));
  const order = (id) => db.exec(`insert into "Order"(id,"orderNumber",fulfillment,phone,"totalAmount","updatedAt") values ('${id}','${id}','LOCAL_PICKUP','254700000000',5000,now())`);
  const refund = (id, o, amt, st) => db.exec(`insert into "OrderRefund"(id,"orderId",amount,reason,method,status) values ('${id}','${o}',${amt},'x','MPESA','${st}')`);
  for (const o of ["o_none", "o_one", "o_many", "o_other"]) await order(o); await refund("r1", "o_one", 700, "SENT"); await refund("r2", "o_many", 1000, "PENDING"); await refund("r3", "o_many", 500, "FAILED"); await refund("r4", "o_many", 250, "SENT"); await refund("r5", "o_other", 3000, "PENDING");
  await db.exec(sql(names[at]));
  const got = Object.fromEntries((await db.query(`select id, "refundedAmount" as a from "Order"`)).rows.map((r) => [r.id, r.a]));
  t("EACH ORDER'S RUNNING TOTAL IS THE SUM OF ITS OWN REFUNDS, whatever their status (waiting, failed and sent all count: they are money owed back or sent), and an order with none is 0 (and is not mixed up with another's)", got.o_none === 0 && got.o_one === 700 && got.o_many === 1750 && got.o_other === 3000);
  const col = (await db.query(`select is_nullable as n, column_default as d, data_type as t from information_schema.columns where table_name='Order' and column_name='refundedAmount'`)).rows[0];
  await order("o_new");
  t("THE COLUMN IS A WHOLE NUMBER THAT CAN NEVER BE EMPTY AND STARTS AT 0 for every new order; no order was lost", col.n === "NO" && col.t === "integer" && (await db.query(`select "refundedAmount" as a from "Order" where id='o_new'`)).rows[0].a === 0 && (await db.query(`select count(*)::int as n from "Order"`)).rows[0].n === 5);
  let nbad = 0; for (const [nm, ok] of res) { console.log((ok ? "PASS " : "FAIL ") + nm); if (!ok) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} REFUNDED TOTAL MIGRATION CHECKS PASSED`); process.exit(nbad ? 1 : 0);
})().catch((e) => { console.error("ERROR:", e); process.exit(2); });
