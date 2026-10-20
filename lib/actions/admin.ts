"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeCredits } from "@/lib/story-credits";
import { parseGuideFields } from "@/lib/field-guide";
import { generateCheckinToken } from "@/lib/passport";
import { imageUrl } from "@/lib/image-policy";
import { cleanDetail, DETAIL_MAX } from "@/lib/event-details";

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
  image: imageUrl,
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  checkinRadiusM: z.coerce.number().int().min(50).max(5000).optional(),
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
    checkinRadiusM: formData.get("checkinRadiusM") || undefined,
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
  });

  if ((parsed.latitude === undefined) !== (parsed.longitude === undefined)) {
    throw new Error("Enter both latitude and longitude, or leave both blank.");
  }

  const place = parseGuideFields(formData, "place");
  if (!place.ok) throw new Error(place.error);

  if (id) {
    // Blank coordinates mean "no coordinates" — clear them instead of silently keeping the old values.
    await prisma.destination.update({
      where: { id },
      data: { ...parsed, ...place.values, latitude: parsed.latitude ?? null, longitude: parsed.longitude ?? null },
    });
  } else {
    await prisma.destination.create({
      data: {
        ...parsed,
        ...place.values,
        slug: `${slugify(parsed.name)}-${Math.random().toString(36).slice(2, 6)}`,
        isDemo: false,
        createdById: user.id,
        checkinToken: generateCheckinToken(),
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
  image: imageUrl,
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
  const credits = normalizeCredits(String(formData.get("credits") ?? ""));
  if (!credits.ok) throw new Error(credits.error);

  // The place the story is about is optional; an id that is not a real place is ignored.
  const placeId = String(formData.get("destinationId") ?? "").trim();
  const place = placeId ? await prisma.destination.findUnique({ where: { id: placeId }, select: { id: true } }) : null;
  const destinationId = place?.id ?? null;

  if (id) {
    await prisma.story.update({ where: { id }, data: { ...parsed, credits: credits.value, destinationId } });
  } else {
    await prisma.story.create({
      data: {
        ...parsed,
        credits: credits.value,
        destinationId,
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

// The optional "more details" of an event: tidied (Windows line breaks, trailing spaces, runs of blank lines), nothing stored as null, and each limited in length so a pasted web page cannot swell the table.
const detail = (max: number) => z.preprocess(cleanDetail, z.string().max(max, `Keep this to ${max.toLocaleString("en-GB")} characters or fewer.`).nullable());
const eventSchema = z.object({
  name: z.string().min(2),
  program: z.enum(["TAITA_CUP", "TAITA_WEEK", "TAITA_SOUND"]),
  eventDate: z.coerce.date(),
  location: z.string().min(2),
  blurb: z.string().min(5),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  details: detail(DETAIL_MAX.details), programme: detail(DETAIL_MAX.programme), included: detail(DETAIL_MAX.included), bring: detail(DETAIL_MAX.bring),
  gettingThere: detail(DETAIL_MAX.gettingThere), accessibility: detail(DETAIL_MAX.accessibility), contact: detail(DETAIL_MAX.contact),
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
    details: formData.get("details"), programme: formData.get("programme"), included: formData.get("included"), bring: formData.get("bring"),
    gettingThere: formData.get("gettingThere"), accessibility: formData.get("accessibility"), contact: formData.get("contact"),
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
  if ((await prisma.ticket.count({ where: { eventId: id } })) > 0) {
    throw new Error("This event has tickets, so it can't be deleted — people hold them. Cancel the tickets or turn ticketing off and unpublish the event instead.");
  }
  await prisma.event.delete({ where: { id } });
  revalidatePath("/admin/events");
  revalidatePath("/events");
}
