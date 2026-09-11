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
// Public: submit an application
// ---------------------------------------------------------------------------

const applicationSchema = z.object({
  businessName: z.string().min(2).max(120),
  contactName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(30),
  website: z.string().url().optional().or(z.literal("")),
  partnerType: z.enum([
    "ACCOMMODATION",
    "EXPERIENCE",
    "FOOD",
    "TRANSPORT",
    "CREATOR",
    "SELLER",
    "EVENT",
    "SPONSOR",
  ]),
  message: z.string().min(20).max(2000),
});

export async function submitApplication(formData: FormData) {
  const parseResult = applicationSchema.safeParse({
    businessName: formData.get("businessName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    website: formData.get("website") || "",
    partnerType: formData.get("partnerType"),
    message: formData.get("message"),
  });

  if (!parseResult.success) {
    return { error: "Please check the form — something's missing or too short." };
  }
  const data = parseResult.data;

  await prisma.partnerApplication.create({
    data: {
      businessName: data.businessName,
      contactName: data.contactName,
      email: data.email.toLowerCase(),
      phone: data.phone,
      website: data.website || null,
      partnerType: data.partnerType,
      message: data.message,
    },
  });

  revalidatePath("/admin/partners");
  return { success: true };
}

/** Public status lookup by email — returns only what an applicant should see. */
export async function getApplicationStatus(email: string) {
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) return { error: "Enter a valid email address." };

  const application = await prisma.partnerApplication.findFirst({
    where: { email: parsed.data.toLowerCase() },
    orderBy: { createdAt: "desc" },
  });

  if (!application) return { error: "No application found for that email." };

  return {
    businessName: application.businessName,
    partnerType: application.partnerType,
    status: application.status,
    submittedAt: application.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Admin: review applications
// ---------------------------------------------------------------------------

const reviewSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export async function reviewApplication(id: string, status: string, adminNotes?: string) {
  const user = await requireAdmin();
  const parsedStatus = reviewSchema.parse(status);

  await prisma.partnerApplication.update({
    where: { id },
    data: {
      status: parsedStatus,
      adminNotes: adminNotes ?? undefined,
      reviewedAt: new Date(),
      reviewedById: user.id,
    },
  });

  revalidatePath("/admin/partners");
}

/**
 * Grants SELLER access to whoever already has a Visit Taita account under
 * the application's email. Does not create an account or send an invite —
 * the applicant needs to have registered first. Never downgrades an
 * existing admin-level account.
 */
export async function grantSellerAccess(applicationId: string) {
  await requireAdmin();

  const application = await prisma.partnerApplication.findUnique({
    where: { id: applicationId },
  });
  if (!application) return { error: "Application not found." };

  const matchedUser = await prisma.user.findUnique({
    where: { email: application.email },
  });
  if (!matchedUser) {
    return {
      error: "No Visit Taita account found for this email yet. Ask the applicant to register, then try again.",
    };
  }
  if (ADMIN_ROLES.includes(matchedUser.role)) {
    return { error: `${matchedUser.name} already has admin-level access.` };
  }

  await prisma.user.update({
    where: { id: matchedUser.id },
    data: { role: "SELLER" },
  });

  revalidatePath("/admin/partners");
  return { success: true, name: matchedUser.name };
}
