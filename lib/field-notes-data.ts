import { isVerifiedFor } from "@/lib/field-notes";
import { prisma } from "@/lib/prisma";

export type Verification = { verified: boolean; at: Date | null; method: string | null };

/**
 * Has this person passed a QR/GPS check-in at the destination since they claimed the mission?
 * Used by the creator's page (to show the status) and by the submit action (to enforce it).
 */
export async function getVerification(userId: string, destinationId: string, claimedAt: Date): Promise<Verification> {
  const visit = await prisma.visit.findUnique({
    where: { userId_destinationId: { userId, destinationId } },
    select: { method: true, lastVerifiedAt: true },
  });
  if (!isVerifiedFor(visit, claimedAt)) return { verified: false, at: null, method: null };
  return { verified: true, at: visit!.lastVerifiedAt, method: visit!.method };
}
