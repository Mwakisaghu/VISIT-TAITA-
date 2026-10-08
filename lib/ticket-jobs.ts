import { prisma } from "@/lib/prisma";
import { expireDue } from "@/lib/ticket-ops";

/** Run by the scheduled job: releases paid reservations nobody confirmed in time. Never throws. */
export async function processTicketsDue(now: Date = new Date()): Promise<{ expired: number; errors: number }> {
  try { return { ...(await expireDue(prisma, now)), errors: 0 }; } catch (e) { console.error("[tickets] expiry failed:", (e as Error).message); return { expired: 0, errors: 1 }; }
}
