// Adds the researched content (credited stories, places, draft stays, sample products) to a database that already exists.
//   node scripts/import-content.mjs            shows what WOULD be added (nothing is written)
//   node scripts/import-content.mjs --apply    adds it
// It only ADDS: anything that already exists (same address) is left exactly as it is. Real lodges are added as UNPUBLISHED drafts.
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { pickImage, planContent } from "./lib/content-plan.mjs";

const apply = process.argv.includes("--apply");
const content = JSON.parse(fs.readFileSync(new URL("../prisma/data/taita-content.json", import.meta.url), "utf8"));
if (!process.env.DATABASE_URL) { console.error("ERROR: DATABASE_URL is not set, so there is no database to read."); process.exit(1); }
const prisma = new PrismaClient();
try {
  const [stories, places, stays, products, admin] = await Promise.all([
    prisma.story.findMany({ select: { slug: true, image: true } }), prisma.destination.findMany({ select: { id: true, slug: true, category: true, image: true } }),
    prisma.accommodation.findMany({ select: { slug: true, image: true } }), prisma.product.findMany({ select: { slug: true, sku: true, image: true } }),
    prisma.user.findFirst({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } }, select: { id: true } }),
  ]);
  const plan = planContent({ stories: stories.map((s) => s.slug), places: places.map((p) => p.slug), stays: stays.map((s) => s.slug), products: products.map((p) => p.slug), skus: products.map((p) => p.sku) }, content);
  const storyImg = Object.fromEntries(stories.map((s) => [s.slug, s.image])), productImg = Object.fromEntries(products.map((p) => [p.slug, p.image]));
  const placeImgByCat = {}; for (const p of places) placeImgByCat[p.category] ??= p.image;
  console.log(`\nPlaces: ${plan.places.length} to add\nStories: ${plan.stories.length} to add (with credits)\nStays: ${plan.stays.length} to add as UNPUBLISHED drafts (contact each lodge before publishing)\nProducts: ${plan.products.length} to add (samples)`);
  for (const k of ["places", "stories", "stays", "products"]) for (const i of plan[k]) console.log(`  + ${({ places: "place", stories: "story", stays: "stay", products: "product" })[k].padEnd(7)} ${i.name ?? i.title}`);
  if (plan.skipped.length) console.log("\nLeft alone:\n  " + plan.skipped.join("\n  "));
  if (!apply) { console.log("\nDry run: nothing was written. Run again with --apply to add these."); process.exit(0); }

  const anyStoryImg = stories[0]?.image ?? null, anyStayImg = stays[0]?.image ?? null, anyProductImg = products[0]?.image ?? null, anyPlaceImg = places[0]?.image ?? null; let added = 0, skipped = 0;
  const idBySlug = Object.fromEntries(places.map((p) => [p.slug, p.id]));
  for (const p of plan.places) {
    const image = pickImage(null, null, placeImgByCat[p.category] ?? anyPlaceImg); if (!image) { console.log(`  skipped place ${p.slug}: no existing picture to borrow`); skipped++; continue; }
    const { position, note, ...data } = p; const row = await prisma.destination.create({ data: { ...data, image, status: "PUBLISHED", isDemo: false, createdById: admin?.id ?? null } }); idBySlug[p.slug] = row.id; added++;
  }
  for (const s of plan.stories) {
    const image = pickImage(s.imageFrom, storyImg, anyStoryImg); if (!image) { console.log(`  skipped story ${s.slug}: no existing picture to borrow`); skipped++; continue; }
    const { destination, imageFrom, ...data } = s; await prisma.story.create({ data: { ...data, image, destinationId: idBySlug[destination] ?? null, status: "PUBLISHED", isDemo: false, authorId: admin?.id ?? null } }); added++;
  }
  for (const s of plan.stays) {
    if (!anyStayImg) { console.log(`  skipped stay ${s.slug}: no existing picture to borrow`); skipped++; continue; }
    const { note, ...data } = s; await prisma.accommodation.create({ data: { ...data, image: anyStayImg, status: "DRAFT", isDemo: false } }); added++;
  }
  for (const p of plan.products) {
    if (!admin) { console.log(`  skipped product ${p.slug}: no admin account to own it`); skipped++; continue; }
    const image = pickImage(p.imageFrom, productImg, anyProductImg); if (!image) { console.log(`  skipped product ${p.slug}: no existing picture to borrow`); skipped++; continue; }
    const maker = p.maker ? await prisma.maker.findUnique({ where: { slug: p.maker }, select: { id: true } }) : null;
    const { imageFrom, maker: _m, ...data } = p; await prisma.product.create({ data: { ...data, image, status: "PUBLISHED", isDemo: true, sellerId: admin.id, makerId: maker?.id ?? null } }); added++;
  }
  console.log(`\nDone: ${added} added${skipped ? `, ${skipped} skipped (see above)` : ""}. Existing items were left untouched. Please read docs/content-sources.md and have a local editor review the stories before launch.`);
} finally { await prisma.$disconnect(); }
