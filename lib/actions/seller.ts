"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SELLER_ROLES = ["SELLER", ...ADMIN_ROLES];

async function requireSeller() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !SELLER_ROLES.includes(session.user.role)) {
    throw new Error("Partner access required.");
  }
  return session.user;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  price: z.coerce.number().int().positive(),
  image: z.string().url(),
  category: z.enum([
    "CLOTHING",
    "ART",
    "CRAFTS",
    "FOOD",
    "HOME",
    "BOOKS",
    "PHOTOGRAPHY",
    "COLLECTIBLES",
  ]),
  sku: z.string().min(2),
  inventory: z.coerce.number().int().min(0),
  offersShipping: z.coerce.boolean(),
  offersPickup: z.coerce.boolean(),
  featured: z.coerce.boolean(),
});

/**
 * Create or update a product on behalf of the signed-in partner. A partner
 * can only edit their own listings — admins can edit any. New listings are
 * always saved as DRAFT, so an admin can spot-check before it goes live.
 */
export async function saveSellerProduct(id: string | null, formData: FormData) {
  const user = await requireSeller();
  const isAdmin = ADMIN_ROLES.includes(user.role);

  if (id) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new Error("Product not found.");
    if (!isAdmin && existing.sellerId !== user.id) {
      throw new Error("You can only edit your own listings.");
    }
  }

  const parsed = productSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    image: formData.get("image"),
    category: formData.get("category"),
    sku: formData.get("sku"),
    inventory: formData.get("inventory"),
    offersShipping: formData.get("offersShipping") === "on",
    offersPickup: formData.get("offersPickup") === "on",
    featured: formData.get("featured") === "on",
  });

  if (id) {
    await prisma.product.update({ where: { id }, data: parsed });
  } else {
    await prisma.product.create({
      data: {
        ...parsed,
        slug: `${slugify(parsed.name)}-${Math.random().toString(36).slice(2, 6)}`,
        status: "DRAFT",
        isDemo: false,
        sellerId: user.id,
      },
    });
  }

  revalidatePath("/partner/products");
  revalidatePath("/shop");
  redirect("/partner/products");
}

export async function deleteSellerProduct(id: string) {
  const user = await requireSeller();
  const isAdmin = ADMIN_ROLES.includes(user.role);

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return;
  if (!isAdmin && existing.sellerId !== user.id) {
    throw new Error("You can only delete your own listings.");
  }

  await prisma.product.delete({ where: { id } });
  revalidatePath("/partner/products");
  revalidatePath("/shop");
}
