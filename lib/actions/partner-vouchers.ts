"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export type VoucherActionResult = { success?: true; error?: string };

const PARTNER_ROLES = ["PARTNER", "SELLER"];

/**
 * A partner marks a voucher for one of THEIR rewards as used. The ownership
 * check is part of the same conditional update that flips the status, so a
 * partner can never touch another partner's vouchers, and two people acting at
 * once can never both succeed. Cancelling/refunding stays an admin-only action.
 */
export async function markVoucherUsed(redemptionId: string): Promise<VoucherActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Please sign in." };

  const { id: userId, role } = session.user;
  const isAdmin = ADMIN_ROLES.includes(role);
  if (!isAdmin && !PARTNER_ROLES.includes(role)) return { error: "Partner access required." };

  if (!rateLimit(`voucher-use:${userId}`, 30, 60 * 1000)) {
    return { error: "Too many attempts — please wait a minute." };
  }

  const ownership = isAdmin ? {} : { reward: { ownerId: userId } };
  const id = String(redemptionId ?? "");

  const voucher = await prisma.rewardRedemption.findFirst({
    where: { id, ...ownership },
    include: { reward: { select: { validUntil: true } } },
  });
  // Not yours and not found look identical, so codes can't be probed.
  if (!voucher) return { error: "Voucher not found for your rewards." };

  if (voucher.status === "USED") return { error: "This voucher has already been used." };
  if (voucher.status === "CANCELLED") return { error: "This voucher was cancelled — do not honour it." };

  if (!isAdmin && voucher.reward.validUntil && voucher.reward.validUntil.getTime() < Date.now()) {
    return { error: "This reward has expired — please check with Visit Taita before honouring it." };
  }

  const moved = await prisma.rewardRedemption.updateMany({
    where: { id, status: "ISSUED", ...ownership },
    data: { status: "USED", usedAt: new Date(), usedById: userId },
  });
  if (moved.count === 0) return { error: "This voucher was just updated — refresh to see its status." };

  revalidatePath("/partner/vouchers");
  revalidatePath("/admin/rewards/redemptions");
  revalidatePath("/passport/rewards");
  return { success: true };
}
