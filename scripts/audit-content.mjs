// Checks the database for launch: pictures that are not yours, logos that are web pages, placeholder contact details, sample items still showing.
//   node scripts/audit-content.mjs                     the report (reads only; changes nothing)
//   node scripts/audit-content.mjs --strict            the same, and exits with an error if anything MUST be fixed (for a pre-launch check)
//   node scripts/audit-content.mjs --hide-bad-sponsors shows which published sponsors have a broken or unusable logo
//   node scripts/audit-content.mjs --hide-bad-sponsors --apply   moves those sponsors back to draft (nothing is deleted; you can fix the logo and publish again)
import { PrismaClient } from "@prisma/client";
import { auditRows, formatReport, hideBadSponsors, loadRows } from "./lib/audit.mjs";

if (!process.env.DATABASE_URL) { console.error("ERROR: DATABASE_URL is not set, so there is no database to read."); process.exit(1); }
const prisma = new PrismaClient();
try {
  if (process.argv.includes("--hide-bad-sponsors")) {
    const apply = process.argv.includes("--apply"); const bad = await hideBadSponsors(prisma, apply);
    console.log(bad.length ? bad.map((b) => `  - ${b.name}: ${b.reason}`).join("\n") : "No published sponsor has an unusable logo.");
    if (bad.length) console.log(apply ? `\n${bad.length} sponsor(s) moved back to draft. Fix the logo in /admin/sponsors and publish again.` : "\nNothing was changed. Run again with --apply to move them back to draft.");
  } else {
    const r = auditRows(await loadRows(prisma)); console.log(formatReport(r));
    if (process.argv.includes("--strict") && r.blockers > 0) process.exit(1);
  }
} finally { await prisma.$disconnect(); }
