"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCheckinToken } from "@/lib/passport";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    throw new Error("Admin access required.");
  }
  return session.user;
}

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/** Assigns a fresh token, retrying in the (astronomically unlikely) event of a collision. */
async function assignToken(destinationId: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await prisma.destination.update({
        where: { id: destinationId },
        data: { checkinToken: generateCheckinToken() },
      });
      return;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new Error("Couldn't generate a unique check-in code — please try again.");
}

/**
 * Generates a destination's check-in code, or replaces it. Replacing makes
 * every previously printed plaque for that destination stop working — use it
 * when a code has leaked.
 */
export async function rotateCheckinToken(destinationId: string) {
  await requireAdmin();
  await assignToken(destinationId);
  revalidatePath(`/admin/destinations/${destinationId}/qr`);
  revalidatePath("/admin/destinations");
}

/** Gives every destination that doesn't have a code one. Existing codes are never changed. */
export async function generateMissingCheckinTokens() {
  await requireAdmin();
  const missing = await prisma.destination.findMany({
    where: { checkinToken: null },
    select: { id: true },
  });
  for (const { id } of missing) await assignToken(id);
  revalidatePath("/admin/destinations");
}
