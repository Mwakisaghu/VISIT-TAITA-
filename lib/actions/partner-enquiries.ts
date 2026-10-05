"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { ADMIN_ROLES, authOptions } from "@/lib/auth";
import { isEnquiryStatus } from "@/lib/partner-enquiries-data";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export type PartnerEnquiryResult = { success?: true; error?: string };

const NOT_FOUND = "Enquiry not found for your listings.";

/**
 * A host moves one of THEIR enquiries along: new -> contacted -> confirmed or declined (and back, for mistakes).
 *
 * The ownership check is part of the same query that finds the enquiry (and the one that updates it), so a host can
 * never read or change another host's enquiry — and "not yours" and "doesn't exist" give the identical message, so
 * ids can't be probed. Every change records who made it and when, because "confirmed" feeds sponsor reports and lets
 * a guest leave a verified review.
 */
export async function setEnquiryStatus(kind: string, enquiryId: string, status: string): Promise<PartnerEnquiryResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Please sign in." };

  const { id: userId, role } = session.user;
  const isAdmin = ADMIN_ROLES.includes(role);
  if (!isAdmin && role !== "PARTNER") return { error: "Partner access required." };

  if (!rateLimit(`enquiry-status:${userId}`, 60, 60 * 1000)) return { error: "Too many changes — please wait a minute." };

  if (kind !== "stay" && kind !== "experience") return { error: "Invalid enquiry." };
  if (!isEnquiryStatus(String(status))) return { error: "Invalid status." };
  const id = String(enquiryId ?? "");

  try {
    const data = { status: status as "NEW" | "CONTACTED" | "CONFIRMED" | "DECLINED", statusChangedAt: new Date(), statusChangedById: userId };

    if (kind === "stay") {
      const ownership = isAdmin ? {} : { accommodation: { ownerId: userId } };
      const found = await prisma.accommodationEnquiry.findFirst({ where: { id, ...ownership }, select: { id: true, status: true } });
      if (!found) return { error: NOT_FOUND };
      if (found.status === status) return { success: true };
      const moved = await prisma.accommodationEnquiry.updateMany({ where: { id: found.id, ...ownership }, data });
      if (moved.count === 0) return { error: NOT_FOUND };
    } else {
      const ownership = isAdmin ? {} : { experience: { ownerId: userId } };
      const found = await prisma.experienceEnquiry.findFirst({ where: { id, ...ownership }, select: { id: true, status: true } });
      if (!found) return { error: NOT_FOUND };
      if (found.status === status) return { success: true };
      const moved = await prisma.experienceEnquiry.updateMany({ where: { id: found.id, ...ownership }, data });
      if (moved.count === 0) return { error: NOT_FOUND };
    }
  } catch (err) {
    console.error("[partner-enquiries] status change failed", err);
    return { error: "Couldn't update the enquiry — please try again." };
  }

  revalidatePath("/partner/enquiries");
  revalidatePath("/partner");
  revalidatePath(kind === "stay" ? "/admin/accommodations/enquiries" : "/admin/experiences/enquiries");
  revalidatePath("/admin");
  return { success: true };
}
