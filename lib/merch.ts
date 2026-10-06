// The Visit Taita merchandise, as data. `npm run merch:seed` creates these in the shop (see scripts/seed-merch.ts).
//
// IMPORTANT — PLACEHOLDERS: the prices below are NOT real. They are only there so the products can be created; every shirt is
// created as a DRAFT with ZERO stock, so none can be bought until someone sets the real price and stock in Admin -> Shop and
// publishes it. The pictures are design previews (see the note in every description), to be replaced with real product photos.

import type { ProductCategory } from "@prisma/client";

export type MerchProduct = {
  slug: string;
  name: string;
  /** Placeholder KES price — set the real one in Admin before publishing. */
  price: number;
  image: string;
  sku: string;
  category: ProductCategory;
  description: string;
};

export const MERCH_OPTIONS = ["S", "M", "L", "XL", "XXL"];

const PREVIEW_NOTE = "Design preview: the pictures are illustrations of the design, so colours and print may differ slightly on the finished product.";
const QR_BACK = "The back carries a “Discover Taita Hills” QR code that opens Visit Taita.";

export const MERCH_PRODUCTS: MerchProduct[] = [
  {
    slug: "visit-taita-classic-polo", name: "Visit Taita Classic Polo — White", price: 2500, sku: "VT-POLO-WHT", category: "CLOTHING", image: "/merch/visit-taita-classic-polo.jpg",
    description: `A classic white polo with the navy Visit Taita logo on the chest. ${QR_BACK} Choose your size at checkout. ${PREVIEW_NOTE}`,
  },
  {
    slug: "visit-taita-polo-navy-trim", name: "Visit Taita Polo with Navy Trim", price: 2800, sku: "VT-POLO-TRIM", category: "CLOTHING", image: "/merch/visit-taita-polo-navy-trim.jpg",
    description: `A white polo with navy collar and cuff trim, the Visit Taita logo on the chest and a small acacia mark on the sleeve. ${QR_BACK} Choose your size at checkout. ${PREVIEW_NOTE}`,
  },
  {
    slug: "visit-taita-navy-match-day-tee", name: "Visit Taita Navy Match-Day Tee", price: 1800, sku: "VT-TEE-NAVY", category: "CLOTHING", image: "/merch/visit-taita-navy-match-day-tee.jpg",
    description: `A navy match-day tee with the white Visit Taita logo, a hill-line pattern across the hem and “Visit Taita” on the sleeves. ${QR_BACK} Choose your size at checkout. ${PREVIEW_NOTE}`,
  },
  {
    slug: "visit-taita-raglan-tee", name: "Visit Taita Raglan Tee — White & Black", price: 1600, sku: "VT-TEE-RAGLAN", category: "CLOTHING", image: "/merch/visit-taita-raglan-tee.jpg",
    description: `A white raglan tee with black sleeves, the black Visit Taita logo on the chest and “Visit Taita” on the sleeve. ${QR_BACK} Choose your size at checkout. ${PREVIEW_NOTE}`,
  },
  {
    slug: "visit-taita-basketball-jersey", name: "Visit Taita Basketball Jersey — Black & Gold", price: 2200, sku: "VT-JERSEY-BLK", category: "CLOTHING", image: "/merch/visit-taita-basketball-jersey.jpg",
    description: `A black basketball-style jersey with gold trim, the Visit Taita logo and the number 01 on the front, and “Explore · Experience · Support” across the back. ${QR_BACK} Choose your size at checkout. ${PREVIEW_NOTE}`,
  },
  {
    slug: "visit-taita-classic-tee", name: "Visit Taita Classic Tee — White", price: 1500, sku: "VT-TEE-WHT", category: "CLOTHING", image: "/merch/visit-taita-classic-tee.jpg",
    description: `A white classic tee with the black Visit Taita logo on the chest. Choose your size at checkout. ${PREVIEW_NOTE}`,
  },
  {
    slug: "visit-taita-forest-green-tee", name: "Visit Taita Forest Green Tee", price: 1500, sku: "VT-TEE-GRN", category: "CLOTHING", image: "/merch/visit-taita-forest-green-tee.jpg",
    description: `A forest-green tee with the Visit Taita mountain-and-sun mark on the chest. ${QR_BACK} Choose your size at checkout. ${PREVIEW_NOTE}`,
  },
  {
    slug: "visit-taita-black-tee", name: "Visit Taita Black Tee", price: 1600, sku: "VT-TEE-BLK", category: "CLOTHING", image: "/merch/visit-taita-black-tee.jpg",
    description: `A black tee with the white Visit Taita logo on the chest. ${QR_BACK} Choose your size at checkout. ${PREVIEW_NOTE}`,
  },
];

type SeedDb = {
  product: {
    findUnique(args: { where: { slug: string }; select: { id: true } }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
};

/**
 * Creates any shirt that isn't in the shop yet — as a DRAFT with ZERO stock and a PLACEHOLDER price, so nothing can be bought
 * until the real price and stock are set in Admin and it is published. A shirt that already exists is never touched, so
 * re-running can't overwrite a price, stock level or status someone has since set.
 */
export async function seedMerch(db: SeedDb, log: (message: string) => void = () => {}): Promise<{ created: number; existing: number }> {
  let created = 0;
  for (const p of MERCH_PRODUCTS) {
    const found = await db.product.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (found) {
      log(`  = ${p.name} (already there — left untouched)`);
      continue;
    }
    await db.product.create({
      data: {
        slug: p.slug, name: p.name, description: p.description, price: p.price, image: p.image, sku: p.sku, category: p.category,
        options: MERCH_OPTIONS, optionLabel: "Size", inventory: 0, status: "DRAFT", isDemo: false, featured: false, offersShipping: true, offersPickup: true,
      },
    });
    created++;
    log(`  + ${p.name} — draft, KES ${p.price} (PLACEHOLDER), stock 0`);
  }
  return { created, existing: MERCH_PRODUCTS.length - created };
}
