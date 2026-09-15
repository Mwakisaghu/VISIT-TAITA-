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

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

const venueSchema = z.object({
  name: z.string().min(2),
  location: z.string().min(2),
  image: z.string().url(),
});

export async function saveFestivalVenue(id: string | null, formData: FormData) {
  await requireAdmin();
  const parsed = venueSchema.parse({
    name: formData.get("name"),
    location: formData.get("location"),
    image: formData.get("image"),
  });

  if (id) {
    await prisma.festivalVenue.update({ where: { id }, data: parsed });
  } else {
    await prisma.festivalVenue.create({
      data: {
        ...parsed,
        slug: `${slugify(parsed.name)}-${Math.random().toString(36).slice(2, 6)}`,
        isDemo: false,
      },
    });
  }

  revalidatePath("/admin/week/venues");
  revalidatePath("/events/taita-week");
  redirect("/admin/week/venues");
}

export async function deleteFestivalVenue(id: string) {
  await requireAdmin();
  await prisma.festivalVenue.delete({ where: { id } });
  revalidatePath("/admin/week/venues");
  revalidatePath("/events/taita-week");
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

const sessionSchema = z.object({
  title: z.string().min(2),
  category: z.enum(["MUSIC", "FOOD", "CULTURE", "SPORT", "FAMILY", "MARKET", "TALKS"]),
  description: z.string().min(10),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  ticketStatus: z.enum(["FREE", "TICKETED", "SOLD_OUT"]),
  price: z.coerce.number().int().positive().optional(),
  ticketUrl: z.string().url().optional().or(z.literal("")),
  venueId: z.string().min(1),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  featured: z.coerce.boolean(),
});

export async function saveFestivalSession(id: string | null, formData: FormData) {
  await requireAdmin();
  const rawEndsAt = formData.get("endsAt");
  const rawPrice = formData.get("price");
  const parsed = sessionSchema.parse({
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description"),
    startsAt: formData.get("startsAt"),
    endsAt: rawEndsAt ? rawEndsAt : undefined,
    ticketStatus: formData.get("ticketStatus"),
    price: rawPrice ? rawPrice : undefined,
    ticketUrl: formData.get("ticketUrl") || "",
    venueId: formData.get("venueId"),
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
  });

  const data = { ...parsed, ticketUrl: parsed.ticketUrl || null };

  if (id) {
    await prisma.festivalSession.update({ where: { id }, data });
  } else {
    await prisma.festivalSession.create({
      data: {
        ...data,
        slug: `${slugify(parsed.title)}-${Math.random().toString(36).slice(2, 6)}`,
        isDemo: false,
      },
    });
  }

  revalidatePath("/admin/week/sessions");
  revalidatePath("/events/taita-week");
  redirect("/admin/week/sessions");
}

export async function deleteFestivalSession(id: string) {
  await requireAdmin();
  await prisma.festivalSession.delete({ where: { id } });
  revalidatePath("/admin/week/sessions");
  revalidatePath("/events/taita-week");
}
