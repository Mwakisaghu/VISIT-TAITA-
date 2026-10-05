"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { parseReferral } from "@/lib/referral";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { notifyAccommodationEnquiry, notifyExperienceEnquiry } from "@/lib/notifications";

type EnquiryResult = { success?: true; error?: string };

const TOO_MANY: EnquiryResult = { error: "Too many enquiries — please try again a little later." };
const HOUR_MS = 60 * 60 * 1000;

type ListingRef = { kind: "accommodation" | "experience"; id: string };

/**
 * Works out whether an enquiry began on a mission page or one of its Field Notes (the `from` link).
 *
 * Credit is given ONLY when the listing is the one that mission actually features — otherwise anyone could add
 * ?from=... to any listing URL and pad a sponsor's numbers — and only for a mission that is public and a note that
 * is published. It never blocks or alters the enquiry: anything doubtful just means "no referral".
 */
async function resolveReferral(raw: FormDataEntryValue | null, listing: ListingRef): Promise<{ noteId: string | null; missionId: string } | null> {
  const ref = parseReferral(typeof raw === "string" ? raw : null);
  if (!ref) return null;
  const select = { id: true, accommodationId: true, experienceId: true } as const;
  const features = (m: { accommodationId: string | null; experienceId: string | null }) =>
    listing.kind === "accommodation" ? m.accommodationId === listing.id : m.experienceId === listing.id;
  try {
    if (ref.kind === "note") {
      const note = await prisma.fieldNote.findFirst({ where: { slug: ref.slug, status: "APPROVED" }, select: { id: true, mission: { select } } });
      return note && features(note.mission) ? { noteId: note.id, missionId: note.mission.id } : null;
    }
    const mission = await prisma.mission.findFirst({ where: { slug: ref.slug, status: { in: ["OPEN", "CLOSED"] } }, select });
    return mission && features(mission) ? { noteId: null, missionId: mission.id } : null;
  } catch {
    return null;
  }
}

function clientIp() {
  const forwarded = headers().get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : null;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    throw new Error("Admin access required.");
  }
  return session.user;
}

// ---------------------------------------------------------------------------
// Public: submit an enquiry
// ---------------------------------------------------------------------------

const accommodationEnquirySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(30),
  checkIn: z.coerce.date().optional(),
  checkOut: z.coerce.date().optional(),
  guests: z.coerce.number().int().positive().optional(),
  message: z.string().min(10).max(2000),
}).refine((d) => !d.checkIn || !d.checkOut || d.checkOut > d.checkIn, {
  message: "Check-out must be after check-in.",
  path: ["checkOut"],
});

export async function submitAccommodationEnquiry(
  accommodationId: string,
  formData: FormData
): Promise<EnquiryResult> {
  const session = await getServerSession(authOptions);

  const rawCheckIn = formData.get("checkIn");
  const rawCheckOut = formData.get("checkOut");
  const rawGuests = formData.get("guests");

  const parseResult = accommodationEnquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    checkIn: rawCheckIn ? rawCheckIn : undefined,
    checkOut: rawCheckOut ? rawCheckOut : undefined,
    guests: rawGuests ? rawGuests : undefined,
    message: formData.get("message"),
  });

  if (!parseResult.success) {
    return { error: "Please check the form — something's missing or too short." };
  }
  const data = parseResult.data;

  const accommodation = await prisma.accommodation.findUnique({ where: { id: accommodationId } });
  if (!accommodation || accommodation.status !== "PUBLISHED") {
    return { error: "This listing is no longer available." };
  }

  const ip = clientIp();
  if (ip && !rateLimit(`enquiry:${ip}`, 5, 10 * 60 * 1000)) return TOO_MANY;
  const recentFromEmail = await prisma.accommodationEnquiry.count({
    where: { email: data.email.toLowerCase(), createdAt: { gte: new Date(Date.now() - HOUR_MS) } },
  });
  if (recentFromEmail >= 5) return TOO_MANY;

  const referral = await resolveReferral(formData.get("from"), { kind: "accommodation", id: accommodationId });

  const enquiry = await prisma.accommodationEnquiry.create({
    data: {
      accommodationId,
      referredByNoteId: referral?.noteId ?? null,
      referredByMissionId: referral?.missionId ?? null,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      checkIn: data.checkIn ?? null,
      checkOut: data.checkOut ?? null,
      guests: data.guests ?? null,
      message: data.message,
      userId: session?.user?.id ?? null,
    },
  });

  // Saved first — a mail failure must never lose the enquiry.
  await notifyAccommodationEnquiry(enquiry, accommodation);

  revalidatePath("/admin/accommodations/enquiries");
  revalidatePath("/admin");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Public: submit an experience enquiry
// ---------------------------------------------------------------------------

const experienceEnquirySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(30),
  preferredDate: z.coerce.date().optional(),
  partySize: z.coerce.number().int().positive().optional(),
  message: z.string().min(10).max(2000),
});

export async function submitExperienceEnquiry(
  experienceId: string,
  formData: FormData
): Promise<EnquiryResult> {
  const session = await getServerSession(authOptions);

  const rawDate = formData.get("preferredDate");
  const rawPartySize = formData.get("partySize");

  const parseResult = experienceEnquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    preferredDate: rawDate ? rawDate : undefined,
    partySize: rawPartySize ? rawPartySize : undefined,
    message: formData.get("message"),
  });

  if (!parseResult.success) {
    return { error: "Please check the form — something's missing or too short." };
  }
  const data = parseResult.data;

  const experience = await prisma.experience.findUnique({ where: { id: experienceId } });
  if (!experience || experience.status !== "PUBLISHED") {
    return { error: "This experience is no longer available." };
  }

  const ip = clientIp();
  if (ip && !rateLimit(`enquiry:${ip}`, 5, 10 * 60 * 1000)) return TOO_MANY;
  const recentFromEmail = await prisma.experienceEnquiry.count({
    where: { email: data.email.toLowerCase(), createdAt: { gte: new Date(Date.now() - HOUR_MS) } },
  });
  if (recentFromEmail >= 5) return TOO_MANY;

  const referral = await resolveReferral(formData.get("from"), { kind: "experience", id: experienceId });

  const enquiry = await prisma.experienceEnquiry.create({
    data: {
      experienceId,
      referredByNoteId: referral?.noteId ?? null,
      referredByMissionId: referral?.missionId ?? null,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      preferredDate: data.preferredDate ?? null,
      partySize: data.partySize ?? null,
      message: data.message,
      userId: session?.user?.id ?? null,
    },
  });

  await notifyExperienceEnquiry(enquiry, experience);

  revalidatePath("/admin/experiences/enquiries");
  revalidatePath("/admin");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Admin: review enquiries
// ---------------------------------------------------------------------------

const enquiryStatusSchema = z.enum(["NEW", "CONTACTED", "CONFIRMED", "DECLINED"]);

export async function updateAccommodationEnquiryStatus(id: string, status: string) {
  try {
    await requireAdmin();
    const parsed = enquiryStatusSchema.safeParse(status);
    if (!parsed.success) return { error: "Invalid status." };
    await prisma.accommodationEnquiry.update({ where: { id }, data: { status: parsed.data } });
  } catch {
    return { error: "Couldn't update the status — please try again." };
  }
  revalidatePath("/admin/accommodations/enquiries");
  revalidatePath("/admin");
  return { success: true };
}

export async function updateExperienceEnquiryStatus(id: string, status: string) {
  try {
    await requireAdmin();
    const parsed = enquiryStatusSchema.safeParse(status);
    if (!parsed.success) return { error: "Invalid status." };
    await prisma.experienceEnquiry.update({ where: { id }, data: { status: parsed.data } });
  } catch {
    return { error: "Couldn't update the status — please try again." };
  }
  revalidatePath("/admin/experiences/enquiries");
  revalidatePath("/admin");
  return { success: true };
}
