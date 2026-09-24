"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

function parseAmenities(raw: FormDataEntryValue | null) {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Accommodation
// ---------------------------------------------------------------------------

const accommodationSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["HOTEL", "LODGE", "GUESTHOUSE", "HOMESTAY", "CAMPSITE"]),
  region: z.string().min(2),
  description: z.string().min(10),
  image: z.string().url(),
  priceFrom: z.coerce.number().int().positive().optional(),
  amenities: z.array(z.string()).default([]),
  contactPhone: z.string().optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  externalBookingUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  featured: z.coerce.boolean(),
});

export async function saveAccommodation(id: string | null, formData: FormData) {
  const user = await requireAdmin();
  const rawPrice = formData.get("priceFrom");
  const parsed = accommodationSchema.parse({
    name: formData.get("name"),
    type: formData.get("type"),
    region: formData.get("region"),
    description: formData.get("description"),
    image: formData.get("image"),
    priceFrom: rawPrice ? rawPrice : undefined,
    amenities: parseAmenities(formData.get("amenities")),
    contactPhone: formData.get("contactPhone") || "",
    contactEmail: formData.get("contactEmail") || "",
    externalBookingUrl: formData.get("externalBookingUrl") || "",
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
  });

  const data = {
    ...parsed,
    priceFrom: parsed.priceFrom ?? null,
    contactPhone: parsed.contactPhone || null,
    contactEmail: parsed.contactEmail || null,
    externalBookingUrl: parsed.externalBookingUrl || null,
  };

  if (id) {
    await prisma.accommodation.update({ where: { id }, data });
  } else {
    await prisma.accommodation.create({
      data: {
        ...data,
        slug: `${slugify(parsed.name)}-${Math.random().toString(36).slice(2, 6)}`,
        isDemo: false,
        ownerId: user.id,
      },
    });
  }

  revalidatePath("/admin/accommodations");
  revalidatePath("/stay");
  redirect("/admin/accommodations");
}

export async function deleteAccommodation(id: string) {
  await requireAdmin();
  await prisma.accommodation.delete({ where: { id } });
  revalidatePath("/admin/accommodations");
  revalidatePath("/stay");
}

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------

const experienceSchema = z.object({
  name: z.string().min(2),
  category: z.enum(["WILDLIFE", "CULTURE", "ADVENTURE", "FOOD", "WELLNESS"]),
  region: z.string().min(2),
  description: z.string().min(10),
  image: z.string().url(),
  priceFrom: z.coerce.number().int().positive().optional(),
  duration: z.string().optional().or(z.literal("")),
  groupSizeMax: z.coerce.number().int().positive().optional(),
  contactPhone: z.string().optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  externalBookingUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  featured: z.coerce.boolean(),
});

export async function saveExperience(id: string | null, formData: FormData) {
  const user = await requireAdmin();
  const rawPrice = formData.get("priceFrom");
  const rawGroupSize = formData.get("groupSizeMax");
  const parsed = experienceSchema.parse({
    name: formData.get("name"),
    category: formData.get("category"),
    region: formData.get("region"),
    description: formData.get("description"),
    image: formData.get("image"),
    priceFrom: rawPrice ? rawPrice : undefined,
    duration: formData.get("duration") || "",
    groupSizeMax: rawGroupSize ? rawGroupSize : undefined,
    contactPhone: formData.get("contactPhone") || "",
    contactEmail: formData.get("contactEmail") || "",
    externalBookingUrl: formData.get("externalBookingUrl") || "",
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
  });

  const data = {
    ...parsed,
    priceFrom: parsed.priceFrom ?? null,
    duration: parsed.duration || null,
    groupSizeMax: parsed.groupSizeMax ?? null,
    contactPhone: parsed.contactPhone || null,
    contactEmail: parsed.contactEmail || null,
    externalBookingUrl: parsed.externalBookingUrl || null,
  };

  if (id) {
    await prisma.experience.update({ where: { id }, data });
  } else {
    await prisma.experience.create({
      data: {
        ...data,
        slug: `${slugify(parsed.name)}-${Math.random().toString(36).slice(2, 6)}`,
        isDemo: false,
        ownerId: user.id,
      },
    });
  }

  revalidatePath("/admin/experiences");
  revalidatePath("/experiences");
  redirect("/admin/experiences");
}

export async function deleteExperience(id: string) {
  await requireAdmin();
  await prisma.experience.delete({ where: { id } });
  revalidatePath("/admin/experiences");
  revalidatePath("/experiences");
}
