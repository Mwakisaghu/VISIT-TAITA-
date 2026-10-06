// Adds the Visit Taita merchandise to the shop:  npm run merch:seed
//
// Safe to re-run: a shirt that already exists is LEFT ALONE (so a price, stock level or status you set in Admin is never
// overwritten). New shirts are created as DRAFTS with ZERO stock and PLACEHOLDER prices, so nothing can be bought until you set
// the real price and stock in Admin -> Shop and publish it. (The logic lives in lib/merch.ts so it can be tested.)
import { PrismaClient } from "@prisma/client";
import { MERCH_PRODUCTS, seedMerch } from "../lib/merch";

const prisma = new PrismaClient();

seedMerch(prisma, console.log)
  .then(({ created, existing }) => {
    console.log(`\n${created} created, ${existing} already existed (of ${MERCH_PRODUCTS.length}).`);
    if (created > 0) console.log("Next: Admin -> Shop -> Products: set each shirt's REAL price and stock, check the sizes, then publish.");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
