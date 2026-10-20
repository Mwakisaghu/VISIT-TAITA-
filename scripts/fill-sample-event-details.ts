// Puts realistic "more details" on the three sample events already in your database, so the "Show more details" section has something to show:
//   npx tsx scripts/fill-sample-event-details.ts            a rehearsal: shows what it would do and changes nothing
//   npx tsx scripts/fill-sample-event-details.ts --apply    does it
// Safe to run twice: an event that is not a sample, or already has any detail, is left alone. (The logic lives in prisma/sample-event-details.ts, beside the seed, so it can be tested.)
import { PrismaClient } from "@prisma/client";
import { fillSampleDetails } from "../prisma/sample-event-details";

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();

if (!process.env.DATABASE_URL) { console.error("ERROR: DATABASE_URL is not set, so there is no database to change."); process.exit(1); }
fillSampleDetails(prisma as never, { apply, log: console.log })
  .then(({ filled, skipped }) => {
    console.log(`\n${filled.length} ${apply ? "filled" : "would be filled"}, ${skipped.length} left alone.`);
    if (!apply && filled.length) console.log("Nothing was changed. Run again with --apply to do it.");
  })
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
