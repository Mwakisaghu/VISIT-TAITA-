"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { wishDecision } from "@/lib/stamps";

export type WishResult = { ok: true; wanted: boolean } | { ok: false; error: string };

/** Put a place on the person's "Want to go" list, or take it off. Only ever touches the signed-in person's own list. */
export async function toggleWish(destinationId: string): Promise<WishResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Please sign in to save places." };
  const userId = session.user.id;
  const id = typeof destinationId === "string" ? destinationId.trim() : "";
  if (id.length === 0 || id.length > 64) return { ok: false, error: "That place can't be saved." };

  const key = { userId_destinationId: { userId, destinationId: id } };
  const existing = await prisma.placeWish.findUnique({ where: key, select: { id: true } });
  if (existing) {
    await prisma.placeWish.deleteMany({ where: { userId, destinationId: id } });
    revalidatePath("/passport");
    return { ok: true, wanted: false };
  }
  const place = await prisma.destination.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!place || place.status !== "PUBLISHED") return { ok: false, error: "That place can't be saved." };
  const decision = wishDecision(false, await prisma.placeWish.count({ where: { userId } }));
  if (decision.action === "refuse") return { ok: false, error: decision.reason ?? "Your list is full." };
  try {
    await prisma.placeWish.create({ data: { userId, destinationId: id } });
  } catch (e) {
    // Two taps at once: the second one finds it already saved. That is fine, it is saved.
    if ((e as { code?: string })?.code !== "P2002") throw e;
  }
  revalidatePath("/passport");
  return { ok: true, wanted: true };
}
