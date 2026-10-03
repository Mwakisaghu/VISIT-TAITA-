"use server";

import { revalidatePath } from "next/cache";
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

/**
 * Grants PARTNER access (the role used for accommodation and experience
 * listings) to whoever already has a Visit Taita account under the
 * application's email. Mirrors grantSellerAccess: it does not create an
 * account or send an invite, and never downgrades an admin-level account.
 */
export async function grantPartnerAccess(applicationId: string) {
  await requireAdmin();

  const application = await prisma.partnerApplication.findUnique({
    where: { id: applicationId },
  });
  if (!application) return { error: "Application not found." };

  if (application.partnerType !== "ACCOMMODATION" && application.partnerType !== "EXPERIENCE") {
    return { error: "Partner access applies to accommodation and experience applications only." };
  }

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
    data: { role: "PARTNER" },
  });

  revalidatePath("/admin/partners");
  return { success: true, name: matchedUser.name };
}
