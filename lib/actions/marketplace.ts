"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { IMAGE_REF_MESSAGE, isImageRef } from "@/lib/image-ref";
import { prisma } from "@/lib/prisma";
import { parseProvenance } from "@/lib/makers";
import { parseOptionLabel, parseOptionList, resolveOption } from "@/lib/product-options";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    throw new Error("Admin access required.");
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

// ---------------------------------------------------------------------------
// Admin: products
// ---------------------------------------------------------------------------

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  price: z.coerce.number().int().positive(),
  image: z.string().trim().refine(isImageRef, IMAGE_REF_MESSAGE),
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
  status: z.enum(["DRAFT", "PUBLISHED"]),
  featured: z.coerce.boolean(),
});

export async function saveProduct(id: string | null, formData: FormData) {
  const user = await requireAdmin();
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
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
  });

  const optionList = parseOptionList(formData.get("options"));
  if ("error" in optionList) throw new Error(optionList.error);
  const optionLabel = parseOptionLabel(formData.get("optionLabel"));
  if ("error" in optionLabel) throw new Error(optionLabel.error);
  const prov = parseProvenance(formData);
  if (!prov.ok) throw new Error(prov.error);
  // The maker must be a real one; an id that is not is ignored. An empty choice clears it.
  const maker = prov.values.makerId ? await prisma.maker.findUnique({ where: { id: prov.values.makerId }, select: { id: true } }) : null;
  const data = { ...parsed, options: optionList.options, optionLabel: optionLabel.label, ...prov.values, makerId: maker?.id ?? null };

  if (id) {
    await prisma.product.update({ where: { id }, data });
  } else {
    await prisma.product.create({
      data: {
        ...data,
        slug: `${slugify(parsed.name)}-${Math.random().toString(36).slice(2, 6)}`,
        isDemo: false,
        sellerId: user.id,
      },
    });
  }

  revalidatePath("/admin/shop/products");
  revalidatePath("/shop");
  redirect("/admin/shop/products");
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin/shop/products");
  revalidatePath("/shop");
}

/** One-click approve for a partner-submitted draft — no need to open the full edit form. */
export async function publishProduct(id: string) {
  await requireAdmin();
  await prisma.product.update({ where: { id }, data: { status: "PUBLISHED" } });
  revalidatePath("/admin/shop/products");
  revalidatePath("/shop");
}

// ---------------------------------------------------------------------------
// Admin: orders
// ---------------------------------------------------------------------------

const orderStatusSchema = z.enum(["PENDING", "CONFIRMED", "FULFILLED", "CANCELLED"]);

export async function updateOrderStatus(id: string, status: string) {
  await requireAdmin();
  const parsed = orderStatusSchema.parse(status);
  await prisma.order.update({ where: { id }, data: { status: parsed } });
  revalidatePath("/admin/shop/orders");
  revalidatePath("/shop/orders");
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive().max(10),
  // The size (or other choice). Checked against what the product really offers — never trusted.
  option: z.string().max(20).optional(),
});

const checkoutSchema = z.object({
  fulfillment: z.enum(["SHIPPING", "LOCAL_PICKUP"]),
  paymentMethod: z.enum(["MPESA", "CARD"]),
  phone: z.string().min(7),
  address: z.string().optional(),
  cart: z.array(cartItemSchema).min(1),
});

export async function placeOrder(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: "You need to sign in to check out." };
  }

  let cart: unknown;
  try {
    cart = JSON.parse(String(formData.get("cart") ?? "[]"));
  } catch {
    return { error: "Your cart looks corrupted — please refresh and try again." };
  }

  const parseResult = checkoutSchema.safeParse({
    fulfillment: formData.get("fulfillment"),
    paymentMethod: formData.get("paymentMethod"),
    phone: formData.get("phone"),
    address: formData.get("address") || undefined,
    cart,
  });

  if (!parseResult.success) {
    return { error: "Please check your details and try again." };
  }
  const parsed = parseResult.data;

  if (parsed.fulfillment === "SHIPPING" && !parsed.address) {
    return { error: "An address is required for shipping." };
  }

  const productIds = parsed.cart.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: "PUBLISHED" },
  });

  const orderItemsData: { productId: string; quantity: number; unitPrice: number; option: string | null }[] = [];
  // Total wanted per product across ALL its cart lines: the same shirt in two sizes shares one stock.
  const wanted = new Map<string, number>();
  let totalAmount = 0;

  for (const item of parsed.cart) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      return { error: "One of the items in your cart is no longer available." };
    }
    const chosen = resolveOption(product, item.option);
    if (!chosen.ok) return { error: chosen.error };

    const total = (wanted.get(product.id) ?? 0) + item.quantity;
    wanted.set(product.id, total);
    if (product.inventory < total) {
      return { error: `Only ${product.inventory} left of "${product.name}".` };
    }
    orderItemsData.push({
      productId: product.id,
      quantity: item.quantity,
      unitPrice: product.price, // always the database price, never the cart's
      option: chosen.option,
    });
    totalAmount += product.price * item.quantity;
  }

  const orderNumber = `TM-${Date.now().toString(36).toUpperCase()}`;

  class SoldOut extends Error {
    constructor(public productName: string) {
      super("sold out");
    }
  }

  let order: { id: string };
  try {
    order = await prisma.$transaction(async (tx) => {
      // Take the stock FIRST, and only if enough is still there (one atomic step per product). The check above is only a
      // friendly early answer: this is what stops two buyers from both getting the last item. If anything fails the whole
      // transaction rolls back, so no stock is lost.
      for (const [productId, quantity] of wanted) {
        const taken = await tx.product.updateMany({
          where: { id: productId, inventory: { gte: quantity } },
          data: { inventory: { decrement: quantity } },
        });
        if (taken.count === 0) throw new SoldOut(products.find((p) => p.id === productId)?.name ?? "That item");
      }

      return tx.order.create({
        data: {
          orderNumber,
          buyerId: session.user.id,
          fulfillment: parsed.fulfillment,
          paymentMethod: parsed.paymentMethod,
          phone: parsed.phone,
          address: parsed.address,
          totalAmount,
          items: { create: orderItemsData },
        },
      });
    });
  } catch (err) {
    if (err instanceof SoldOut) return { error: `Sorry — "${err.productName}" has just sold out, or there isn't enough left.` };
    throw err;
  }

  revalidatePath("/shop");
  revalidatePath("/admin/shop/orders");
  return { orderId: order.id };
}
