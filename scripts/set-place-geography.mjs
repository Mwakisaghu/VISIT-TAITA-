// Fills in map positions and altitudes for places, stays and experiences that already exist, from the researched data in prisma/data/taita-places.json.
//   node scripts/set-place-geography.mjs            shows what WOULD change (nothing is written)
//   node scripts/set-place-geography.mjs --apply    writes it
// It only fills EMPTY fields. Anything already entered is never overwritten, and nothing is created or deleted.
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { planListingUpdates, planPlaceUpdates } from "./lib/geography-plan.mjs";

const apply = process.argv.includes("--apply");
const data = JSON.parse(fs.readFileSync(new URL("../prisma/data/taita-places.json", import.meta.url), "utf8"));
if (!process.env.DATABASE_URL) { console.error("ERROR: DATABASE_URL is not set, so there is no database to read."); process.exit(1); }

const prisma = new PrismaClient();
try {
  const [dest, stays, exps] = await Promise.all([
    prisma.destination.findMany({ select: { id: true, slug: true, name: true, latitude: true, longitude: true, altitudeM: true } }),
    prisma.accommodation.findMany({ select: { id: true, name: true, latitude: true, longitude: true, altitudeM: true } }),
    prisma.experience.findMany({ select: { id: true, name: true, latitude: true, longitude: true, altitudeM: true } }),
  ]);
  const places = planPlaceUpdates(dest, data.places);
  const stayPlan = planListingUpdates(stays, data.sampleGeo), expPlan = planListingUpdates(exps, data.sampleGeo);
  const show = (title, plan) => { console.log(`\n${title}: ${plan.length} to fill in`); for (const p of plan) console.log(`  ${p.name.padEnd(34)} ${Object.entries(p.set).map(([k, v]) => `${k}=${v}`).join("  ")}${p.approximate ? "   (estimate: please verify)" : ""}`); };
  show("Places", places.plan); show("Stays", stayPlan); show("Experiences", expPlan);
  if (places.unmatched.length) console.log(`\nPlaces with no match in the researched data (left alone): ${places.unmatched.join(", ")}`);
  const total = places.plan.length + stayPlan.length + expPlan.length;
  if (!apply) { console.log(`\nDry run: nothing was written. ${total ? "Run again with --apply to write these." : "There is nothing to fill in."}`); }
  else {
    for (const p of places.plan) await prisma.destination.update({ where: { id: p.id }, data: p.set });
    for (const p of stayPlan) await prisma.accommodation.update({ where: { id: p.id }, data: p.set });
    for (const p of expPlan) await prisma.experience.update({ where: { id: p.id }, data: p.set });
    console.log(`\nDone: ${total} filled in. Existing values were left untouched.`);
  }
} finally { await prisma.$disconnect(); }
