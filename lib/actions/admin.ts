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
// Destinations
// ---------------------------------------------------------------------------

const destinationSchema = z.object({
  name: z.string().min(2),
  category: z.enum(["WILD", "CULTURE", "ADVENTURE", "FOOD", "SPORT", "PEOPLE"]),
  region: z.string().min(2),
  blurb: z.string().min(10),
  image: z.string().url(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  featured: z.coerce.boolean(),
});

export async function saveDestination(id: string | null, formData: FormData) {
  const user = await requireAdmin();
  const rawLat = formData.get("latitude");
  const rawLng = formData.get("longitude");
  const parsed = destinationSchema.parse({
    name: formData.get("name"),
    category: formData.get("category"),
    region: formData.get("region"),
    blurb: formData.get("blurb"),
    image: formData.get("image"),
    latitude: rawLat ? rawLat : undefined,
    longitude: rawLng ? rawLng : undefined,
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
  });

  if (id) {
    await prisma.destination.update({ where: { id }, data: parsed });
  } else {
    await prisma.destination.create({
      data: {
        ...parsed,
        slug: `${slugify(parsed.name)}-${Math.random().toString(36).slice(2, 6)}`,
        isDemo: false,
        createdById: user.id,
      },
    });
  }

  revalidatePath("/admin/destinations");
  revalidatePath("/discover");
  redirect("/admin/destinations");
}

export async function deleteDestination(id: string) {
  await requireAdmin();
  await prisma.destination.delete({ where: { id } });
  revalidatePath("/admin/destinations");
  revalidatePath("/discover");
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

const storySchema = z.object({
  title: z.string().min(2),
  category: z.enum(["PEOPLE", "PLACES", "CULTURE", "SPORT", "ADVENTURE"]),
  excerpt: z.string().min(10),
  body: z.string().default(""),
  readingTime: z.string().min(2),
  image: z.string().url(),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  featured: z.coerce.boolean(),
});

export async function saveStory(id: string | null, formData: FormData) {
  const user = await requireAdmin();
  const parsed = storySchema.parse({
    title: formData.get("title"),
    category: formData.get("category"),
    excerpt: formData.get("excerpt"),
    body: formData.get("body") ?? "",
    readingTime: formData.get("readingTime"),
    image: formData.get("image"),
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
  });

  if (id) {
    await prisma.story.update({ where: { id }, data: parsed });
  } else {
    await prisma.story.create({
      data: {
        ...parsed,
        slug: `${slugify(parsed.title)}-${Math.random().toString(36).slice(2, 6)}`,
        isDemo: false,
        authorId: user.id,
      },
    });
  }

  revalidatePath("/admin/stories");
  revalidatePath("/stories");
  redirect("/admin/stories");
}

export async function deleteStory(id: string) {
  await requireAdmin();
  await prisma.story.delete({ where: { id } });
  revalidatePath("/admin/stories");
  revalidatePath("/stories");
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const eventSchema = z.object({
  name: z.string().min(2),
  program: z.enum(["TAITA_CUP", "TAITA_WEEK", "TAITA_SOUND"]),
  eventDate: z.coerce.date(),
  location: z.string().min(2),
  blurb: z.string().min(5),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export async function saveEvent(id: string | null, formData: FormData) {
  await requireAdmin();
  const parsed = eventSchema.parse({
    name: formData.get("name"),
    program: formData.get("program"),
    eventDate: formData.get("eventDate"),
    location: formData.get("location"),
    blurb: formData.get("blurb"),
    status: formData.get("status"),
  });

  if (id) {
    await prisma.event.update({ where: { id }, data: parsed });
  } else {
    await prisma.event.create({
      data: {
        ...parsed,
        slug: `${slugify(parsed.name)}-${Math.random().toString(36).slice(2, 6)}`,
        isDemo: false,
      },
    });
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  redirect("/admin/events");
}

export async function deleteEvent(id: string) {
  await requireAdmin();
  await prisma.event.delete({ where: { id } });
  revalidatePath("/admin/events");
  revalidatePath("/events");
}
