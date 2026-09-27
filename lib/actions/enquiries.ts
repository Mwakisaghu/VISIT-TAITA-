"use server";

import { revalidatePath } from "next/cache";
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
});

export async function submitAccommodationEnquiry(accommodationId: string, formData: FormData) {
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
  if (!accommodation) return { error: "This listing is no longer available." };

  await prisma.accommodationEnquiry.create({
    data: {
      accommodationId,
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

  revalidatePath("/admin/accommodations/enquiries");
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

export async function submitExperienceEnquiry(experienceId: string, formData: FormData) {
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
  if (!experience) return { error: "This experience is no longer available." };

  await prisma.experienceEnquiry.create({
    data: {
      experienceId,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      preferredDate: data.preferredDate ?? null,
      partySize: data.partySize ?? null,
      message: data.message,
      userId: session?.user?.id ?? null,
    },
  });

  revalidatePath("/admin/experiences/enquiries");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Admin: review enquiries
// ---------------------------------------------------------------------------

const enquiryStatusSchema = z.enum(["NEW", "CONTACTED", "CONFIRMED", "DECLINED"]);

export async function updateAccommodationEnquiryStatus(id: string, status: string) {
  await requireAdmin();
  const parsed = enquiryStatusSchema.parse(status);
  await prisma.accommodationEnquiry.update({ where: { id }, data: { status: parsed } });
  revalidatePath("/admin/accommodations/enquiries");
}

export async function updateExperienceEnquiryStatus(id: string, status: string) {
  await requireAdmin();
  const parsed = enquiryStatusSchema.parse(status);
  await prisma.experienceEnquiry.update({ where: { id }, data: { status: parsed } });
  revalidatePath("/admin/experiences/enquiries");
}
