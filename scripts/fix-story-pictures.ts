// Replaces the borrowed or missing pictures of three stories (Salt Lick, Shetani, Ngangao) with pictures the site may use, each with its credit:
//   npx tsx scripts/fix-story-pictures.ts            a rehearsal: shows what it would do and changes nothing
//   npx tsx scripts/fix-story-pictures.ts --apply    does it
// It opens each replacement address from THIS computer first and only uses one that really is a picture. A story that already shows an approved picture is left alone. Safe to run twice.
// (The logic and the pictures live in prisma/story-pictures.ts so they can be tested.)
import { PrismaClient } from "@prisma/client";
import { fixStoryPictures } from "../prisma/story-pictures";

const apply = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) { console.error("ERROR: DATABASE_URL is not set, so there is no database to change."); process.exit(1); }
const prisma = new PrismaClient();

/** Is this address really a picture? (Wikimedia asks automated requests to say who they are.) */
async function isPicture(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", headers: { "User-Agent": "VisitTaitaSetup/1.0 (story picture check)" }, signal: AbortSignal.timeout(15000) });
    const ok = res.ok && /^image\//i.test(res.headers.get("content-type") ?? ""); await res.body?.cancel(); return ok;
  } catch { return false; }
}

fixStoryPictures(prisma as never, { apply, check: isPicture, log: console.log })
  .then(({ fixed, skipped }) => {
    console.log(`\n${fixed.length} ${apply ? "fixed" : "would be fixed"}, ${skipped.length} left alone.`);
    if (!apply && fixed.length) console.log("Nothing was changed. Run again with --apply to do it.");
  })
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
