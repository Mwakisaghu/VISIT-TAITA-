"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { REDEMPTION_STATUSES } from "@/lib/rewards";
import { safeHttpUrl } from "@/lib/url";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    throw new Error("Admin access required.");
  }
  return session.user;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueSlug(base: string) {
  const root = slugify(base) || "reward";
  const taken = await prisma.reward.findUnique({ where: { slug: root } });
  return taken ? `${root}-${Math.random().toString(36).slice(2, 6)}` : root;
}

const httpUrl = z
  .string()
  .url()
  .refine((v) => safeHttpUrl(v) !== null, "Must be an http(s) URL");

function revalidateRewards() {
  revalidatePath("/admin/rewards");
  revalidatePath("/admin/rewards/redemptions");
  revalidatePath("/passport/rewards");
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

const rewardSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(1000),
  pointsCost: z.coerce.number().int().min(1).max(1_000_000),
  partnerName: z.string().trim().max(120).optional().or(z.literal("")),
  instructions: z.string().trim().min(10).max(1000),
  stock: z.coerce.number().int().min(0).max(1_000_000).optional(),
  validUntil: z.coerce.date().optional(),
  image: httpUrl.optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export async function saveReward(id: string | null, formData: FormData) {
  await requireAdmin();
  const rawStock = String(formData.get("stock") ?? "").trim();
  const rawValidUntil = String(formData.get("validUntil") ?? "").trim();

  const parsed = rewardSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    pointsCost: formData.get("pointsCost"),
    partnerName: formData.get("partnerName") || "",
    instructions: formData.get("instructions"),
    stock: rawStock === "" ? undefined : rawStock,
    // End of the chosen day, so "valid until 31 Dec" includes the 31st.
    validUntil: rawValidUntil === "" ? undefined : `${rawValidUntil}T23:59:59.999Z`,
    image: formData.get("image") || "",
    status: formData.get("status"),
  });

  const data = {
    name: parsed.name,
    description: parsed.description,
    pointsCost: parsed.pointsCost,
    partnerName: parsed.partnerName || null,
    instructions: parsed.instructions,
    stock: parsed.stock ?? null, // blank = unlimited
    validUntil: parsed.validUntil ?? null,
    image: parsed.image || null,
    status: parsed.status,
  };

  if (id) {
    await prisma.reward.update({ where: { id }, data });
  } else {
    await prisma.reward.create({ data: { ...data, slug: await uniqueSlug(parsed.name), isDemo: false } });
  }

  revalidateRewards();
  redirect("/admin/rewards");
}

export async function deleteReward(id: string) {
  await requireAdmin();
  // Vouchers must keep pointing at their reward, so a redeemed reward can only be hidden (Draft).
  const redeemed = await prisma.rewardRedemption.count({ where: { rewardId: id } });
  if (redeemed > 0) {
    throw new Error("This reward has been redeemed, so it can't be deleted — set it to Draft instead.");
  }
  await prisma.reward.delete({ where: { id } });
  revalidateRewards();
}

// ---------------------------------------------------------------------------
// Vouchers: mark used / cancel & refund
// ---------------------------------------------------------------------------

export type RedemptionActionResult = { success?: true; error?: string };

class StatusError extends Error {}

/**
 * ISSUED -> USED, or ISSUED -> CANCELLED (which refunds the points and puts a
 * unit of limited stock back). The move out of ISSUED is a conditional update,
 * so two admins acting at once can never refund the same voucher twice.
 */
export async function setRedemptionStatus(
  redemptionId: string,
  status: string
): Promise<RedemptionActionResult> {
  try {
    await requireAdmin();
    if (status !== "USED" && status !== "CANCELLED") return { error: "Invalid status." };
    if (!REDEMPTION_STATUSES.includes(status)) return { error: "Invalid status." };

    await prisma.$transaction(async (tx) => {
      const redemption = await tx.rewardRedemption.findUnique({
        where: { id: redemptionId },
        include: { reward: { select: { name: true, stock: true } } },
      });
      if (!redemption) throw new StatusError("Voucher not found.");
      if (redemption.status === status) return; // already there — nothing to do
      if (redemption.status !== "ISSUED") {
        throw new StatusError(`This voucher is already ${redemption.status.toLowerCase()}.`);
      }

      const moved = await tx.rewardRedemption.updateMany({
        where: { id: redemptionId, status: "ISSUED" },
        data: { status, usedAt: status === "USED" ? new Date() : null },
      });
      if (moved.count === 0) throw new StatusError("This voucher was just changed by someone else.");

      if (status === "CANCELLED") {
        await tx.user.update({
          where: { id: redemption.userId },
          data: { points: { increment: redemption.pointsSpent } },
        });
        await tx.pointsEntry.create({
          data: {
            userId: redemption.userId,
            points: redemption.pointsSpent,
            reason: "REFUND",
            redemptionId,
            note: `Refund: ${redemption.reward.name}`,
          },
        });
        if (redemption.reward.stock !== null) {
          await tx.reward.update({
            where: { id: redemption.rewardId },
            data: { stock: { increment: 1 } },
          });
        }
      }
    });
  } catch (err) {
    if (err instanceof StatusError) return { error: err.message };
    if (err instanceof Error && /Admin access/.test(err.message)) return { error: "Admin access required." };
    console.error("[rewards] status change failed", err);
    return { error: "Couldn't update the voucher — please try again." };
  }

  revalidateRewards();
  return { success: true };
}
