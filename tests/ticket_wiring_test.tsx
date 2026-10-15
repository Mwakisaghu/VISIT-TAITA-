import fs from "fs"; import path from "path"; import { spawnSync } from "child_process";
const FK = require("./ticket_fake"); const { T, makeDb, resetDb, addUser, nid } = FK; const real = makeDb();
const generic = () => ({ count: async () => 0, findMany: async () => [], findFirst: async () => null, findUnique: async () => null });
(globalThis as any).prisma = new Proxy(real, { get: (t: any, k: string) => (k in t ? t[k] : generic()) });
const H = 3600000; const NOW = new Date(); const at = (h: number) => new Date(NOW.getTime() + h * H);
async function main() {
  const res: [string, boolean][] = []; const t = (n: string, ok: boolean) => res.push([n, !!ok]);
  const AD = await import("@/lib/account-data"); const src = (f: string) => fs.readFileSync(f, "utf8");
  const fn = (AD as any).getDeletionBlockers ?? (AD as any).deletionBlockers; t("the account module exposes its deletion-blockers function", typeof fn === "function");

  // ===== deletion is blocked by tickets for an event still to come =====
  resetDb(); const me = addUser({ name: "Jane", email: "j@x.co" }), other = addUser({ email: "o@x.co" });
  const fut = { id: nid("ev"), eventDate: at(24 * 5) }, past = { id: nid("ev"), eventDate: at(-24 * 5) }; T.event.push(fut, past);
  const tk = (u: any, ev: any, status: string) => T.ticket.push({ id: nid("tk"), eventId: ev.id, userId: u.id, status, groupId: "g", number: nid("N"), secret: nid("s"), holderName: "x", holderPhone: "1", price: 0, createdAt: NOW });
  const reasons = async (u: any) => (await fn({ id: u.id, role: "MEMBER" })) as string[];
  t("DELETE BLOCKERS: no tickets -> no ticket reason", !(await reasons(me)).some((r) => /tickets/.test(r)));
  tk(me, fut, "VALID"); t("DELETE BLOCKERS: a VALID ticket for an event still to come blocks deletion, with a clear reason ('after the event, or once you have cancelled them')", (await reasons(me)).some((r) => /tickets for an event that hasn't happened yet/.test(r) && /after the event/.test(r)));
  resetDb(); T.event.push(fut, past); const me2 = addUser({ email: "m2@x.co" }); tk(me2, fut, "PENDING_PAYMENT"); t("DELETE BLOCKERS: a reservation waiting for payment also blocks it", (await reasons(me2)).some((r) => /tickets for an event/.test(r)));
  resetDb(); T.event.push(fut, past); const me3 = addUser({ email: "m3@x.co" }); for (const s of ["CANCELLED", "EXPIRED", "USED"]) tk(me3, fut, s); tk(me3, past, "VALID"); t("DELETE BLOCKERS: cancelled, expired and used tickets, and tickets for a past event, do NOT block deletion", !(await reasons(me3)).some((r) => /tickets/.test(r)));
  resetDb(); T.event.push(fut, past); const me4 = addUser({ email: "m4@x.co" }), oth = addUser({ email: "oth@x.co" }); tk(oth, fut, "VALID"); t("DELETE BLOCKERS: someone ELSE's upcoming ticket never blocks this person", !(await reasons(me4)).some((r) => /tickets/.test(r)));

  // ===== the repo check notices a name used twice (the mistake that happened while building this) =====
  const chk = (dir: string) => spawnSync("node", ["scripts/check-repo.mjs", "--root", dir], { cwd: process.cwd(), encoding: "utf8" });
  const copy = (): string => { const d = path.join(require("os").tmpdir(), `dup${process.pid}_${Math.random().toString(36).slice(2)}`); fs.rmSync(d, { recursive: true, force: true }); spawnSync("git", ["clone", "-q", ".", d], { cwd: process.cwd() }); for (const f of ["prisma/schema.prisma", "scripts/check-repo.mjs", ".github/workflows/ci.yml"]) fs.copyFileSync(f, path.join(d, f)); fs.cpSync("prisma/migrations", path.join(d, "prisma/migrations"), { recursive: true }); spawnSync("git", ["add", "-A"], { cwd: d }); return d; };
  let d = copy(); let r = chk(d); t("REPO CHECK: the current schema and migrations pass", /The Prisma schema and the migrations agree/.test(r.stdout) && !/FAIL  The Prisma schema/.test(r.stdout));
  d = copy(); fs.appendFileSync(path.join(d, "prisma/schema.prisma"), "\nenum TicketMode {\n  A\n}\n"); r = chk(d); t("REPO CHECK: an enum defined twice in the schema is flagged by NAME", /FAIL  The Prisma schema and the migrations agree/.test(r.stdout) && /TicketMode is defined more than once/.test(r.stdout));
  d = copy(); fs.appendFileSync(path.join(d, "prisma/schema.prisma"), "\nmodel Ticket {\n  id String @id\n}\n"); r = chk(d); t("REPO CHECK: a model defined twice is flagged too", /Ticket is defined more than once/.test(r.stdout));
  d = copy(); const dir2 = path.join(d, "prisma/migrations/20261230000000_dup_type"); fs.mkdirSync(dir2); fs.writeFileSync(path.join(dir2, "migration.sql"), `-- CreateEnum\nCREATE TYPE "PayMethod" AS ENUM ('PAYBILL', 'TILL', 'SEND_MONEY', 'BANK', 'OTHER');\n`); r = chk(d); t("REPO CHECK: a type created by two migrations is flagged", /enum PayMethod is created by more than one migration/.test(r.stdout));
  d = copy(); fs.writeFileSync(path.join(d, "prisma/migrations/20261230000001_dup_table/migration.sql") && path.join(d, "prisma/migrations/zz.sql"), ""); const dir3 = path.join(d, "prisma/migrations/20261230000002_dup_table"); fs.mkdirSync(dir3); fs.writeFileSync(path.join(dir3, "migration.sql"), `CREATE TABLE "Ticket" (\n    "id" TEXT NOT NULL,\n    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")\n);\n`); r = chk(d); t("REPO CHECK: a table created by two migrations is flagged", /table Ticket is created by more than one migration/.test(r.stdout));

  // ===== the wiring in the source =====
  t("ACCOUNT DELETION: tickets are anonymised (name, phone and the entered payment code) inside the same transaction as bookings", /tx\.ticket\.updateMany\(\{ where: \{ userId: user\.id \}, data: \{ holderName: "Former attendee", holderPhone: "", claimedReference: null \} \}\)/.test(src("lib/actions/account.ts")));
  t("DATA EXPORT: the person's tickets (with their own phone and entered code) are included", /tickets: tickets\.map/.test(src("lib/account-data.ts")) && /prisma\.ticket\.findMany\(\{ where: \{ userId \}/.test(src("lib/account-data.ts")));
  t("PRIVACY POLICY: has an 'Event tickets' paragraph saying who sees the details, that payment goes to the organiser, and what deletion removes", /\*\*Event tickets:\*\*/.test(src("lib/legal-text.ts")) && /not to us/.test(src("lib/legal-text.ts")) && /remove your name, phone number and payment code/.test(src("lib/legal-text.ts")));
  t("ROBOTS: /tickets (private pages) is kept out of search; the account hub links to My tickets", /"\/tickets"/.test(src("app/robots.ts")) && /href: lp\("\/account\/tickets"\)/.test(src("lib/account-hub-text.ts")));
  t("MENUS: the host menu has an Events link; the admin events list has a Tickets link per event; the public strip links each event", /href="\/partner\/events"/.test(src("app/partner/layout.tsx")) && /\/admin\/events\/\$\{e\.id\}\/tickets/.test(src("app/admin/events/page.tsx")) && /\/events\/\$\{event\.slug\}/.test(src("components/EventStrip.tsx")));
  t("CI: runs Prisma's own validation before the repo check", /npx prisma validate/.test(src(".github/workflows/ci.yml")) && src(".github/workflows/ci.yml").indexOf("prisma validate") < src(".github/workflows/ci.yml").indexOf("check-repo.mjs"));
  t("deleteEvent refuses an event that has tickets; the cron route runs the expiry job", /ticket\.count/.test(src("lib/actions/admin.ts")) && /processTicketsDue\(\)/.test(src("app/api/cron/emails/route.ts")));

  let nbad = 0; for (const [nm, ok2] of res) { console.log((ok2 ? "PASS " : "FAIL ") + nm); if (!ok2) nbad++; }
  console.log(nbad ? `\n${nbad} FAILED` : `\nALL ${res.length} TICKET WIRING CHECKS PASSED`); process.exit(nbad ? 1 : 0);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(2); });
