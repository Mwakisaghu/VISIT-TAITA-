"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyVoucherRedeemed } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import { isRedeemable } from "@/lib/rewards";
import { generateVoucherCode } from "@/lib/voucher-code";

export type RedeemResult = {
  success?: true;
  error?: string;
  code?: string;
  rewardName?: string;
  pointsSpent?: number;
  newBalance?: number;
};

/** A problem the visitor should be told about; thrown inside the transaction so everything rolls back. */
class RedeemError extends Error {}

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/**
 * Spends points on a reward and issues a voucher code — all in ONE transaction:
 *  1. the points are taken with a conditional update (balance >= cost), so two
 *     simultaneous redemptions can never spend the same points;
 *  2. limited stock is taken the same way, so the last unit can't be given twice;
 *  3. the voucher and the ledger entry are written together.
 * If any step fails, nothing is kept.
 */
export async function redeemReward(rewardId: string): Promise<RedeemResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Please sign in to redeem rewards." };
  const userId = session.user.id;

  if (!rateLimit(`redeem:${userId}`, 5, 60 * 1000)) {
    return { error: "Too many attempts — please wait a minute and try again." };
  }

  // A voucher-code collision (vanishingly rare) aborts the transaction, so we
  // retry the whole thing with a fresh code.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // `notify` is for the notification only — it is deliberately NOT part of what
      // we return to the visitor (it contains the partner's email address).
      const { notify, ...result } = await prisma.$transaction(async (tx) => {
        const reward = await tx.reward.findFirst({
          where: { id: String(rewardId), status: "PUBLISHED" },
          include: { owner: { select: { email: true } } },
        });
        if (!reward || !isRedeemable(reward)) {
          throw new RedeemError("This reward isn't available any more.");
        }

        const spent = await tx.user.updateMany({
          where: { id: userId, points: { gte: reward.pointsCost } },
          data: { points: { decrement: reward.pointsCost } },
        });
        if (spent.count === 0) {
          throw new RedeemError(`You need ${reward.pointsCost} points for this reward.`);
        }

        if (reward.stock !== null) {
          const taken = await tx.reward.updateMany({
            where: { id: reward.id, stock: { gt: 0 } },
            data: { stock: { decrement: 1 } },
          });
          if (taken.count === 0) throw new RedeemError("Sorry — that reward has just run out.");
        }

        const code = generateVoucherCode();
        const redemption = await tx.rewardRedemption.create({
          data: { code, userId, rewardId: reward.id, pointsSpent: reward.pointsCost },
        });
        await tx.pointsEntry.create({
          data: {
            userId,
            points: -reward.pointsCost,
            reason: "REDEMPTION",
            redemptionId: redemption.id,
            note: `Redeemed: ${reward.name}`,
          },
        });

        const user = await tx.user.findUnique({ where: { id: userId }, select: { points: true, name: true } });
        return {
          code,
          rewardName: reward.name,
          pointsSpent: reward.pointsCost,
          newBalance: user?.points ?? 0,
          notify: {
            code,
            rewardName: reward.name,
            holderName: user?.name ?? null,
            ownerEmail: reward.owner?.email ?? null,
          },
        };
      });

      revalidatePath("/passport");
      revalidatePath("/passport/rewards");
      revalidatePath("/admin/rewards");
      // Saved first — a mail failure must never undo or block a redemption.
      await notifyVoucherRedeemed(notify);
      return { success: true, ...result };
    } catch (err) {
      if (err instanceof RedeemError) return { error: err.message };
      if (isUniqueViolation(err) && attempt < 2) continue; // code collision — try again
      console.error("[rewards] redemption failed", err);
      return { error: "Something went wrong — your points were not spent. Please try again." };
    }
  }
  return { error: "Something went wrong — your points were not spent. Please try again." };
}
