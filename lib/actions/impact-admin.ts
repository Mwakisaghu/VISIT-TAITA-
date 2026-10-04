"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { ADMIN_ROLES, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ImpactAdminResult = { success?: true; error?: string };

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/** 96 random bits, URL-safe: unguessable, so the link itself is the access control. */
function newReportToken() {
  return randomBytes(12).toString("base64url");
}

/**
 * Manages the shareable report link for a sponsor.
 *  - enable: create a link if there isn't one (an existing link is kept)
 *  - rotate: replace it — anything already sent stops working
 *  - disable: remove it — the link stops working
 * Anyone with the link can see that one sponsor's report and nothing else.
 */
export async function setSponsorReportLink(sponsorId: string, action: string): Promise<ImpactAdminResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) return { error: "Admin access required." };
    if (action !== "enable" && action !== "rotate" && action !== "disable") return { error: "Invalid action." };

    const sponsor = await prisma.sponsor.findUnique({ where: { id: String(sponsorId) }, select: { id: true, reportToken: true } });
    if (!sponsor) return { error: "Sponsor not found." };

    if (action === "disable") {
      await prisma.sponsor.update({ where: { id: sponsor.id }, data: { reportToken: null } });
    } else if (action === "enable" && sponsor.reportToken) {
      return { success: true }; // already enabled — never replace a link someone may already hold
    } else {
      let saved = false;
      for (let attempt = 0; attempt < 3 && !saved; attempt++) {
        try {
          await prisma.sponsor.update({ where: { id: sponsor.id }, data: { reportToken: newReportToken() } });
          saved = true;
        } catch (err) {
          if (!isUniqueViolation(err)) throw err; // a (vanishingly unlikely) collision: try another
        }
      }
      if (!saved) return { error: "Couldn't create a link — please try again." };
    }

    revalidatePath(`/admin/impact/sponsors/${sponsor.id}`);
    revalidatePath("/admin/impact");
    return { success: true };
  } catch (err) {
    console.error("[impact] report link change failed", err);
    return { error: "Something went wrong — please try again." };
  }
}
