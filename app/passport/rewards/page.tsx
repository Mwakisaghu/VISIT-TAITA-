import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redemptionStatusLabel } from "@/lib/rewards";
import RedeemButton from "@/components/passport/RedeemButton";
import { canOptimize } from "@/lib/image-src";

export const metadata: Metadata = { title: "Rewards" };
export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function RewardsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?next=%2Fpassport%2Frewards");

  const now = new Date();
  const [user, rewards, vouchers] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { points: true } }),
    prisma.reward.findMany({
      // Explicit null handling on both nullable columns: a plain NOT (stock = 0)
      // would also drop unlimited rewards, because NULL comparisons are never true.
      where: {
        status: "PUBLISHED",
        AND: [
          { OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
          { OR: [{ stock: null }, { stock: { gt: 0 } }] },
        ],
      },
      orderBy: [{ pointsCost: "asc" }, { name: "asc" }],
    }),
    prisma.rewardRedemption.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { reward: { select: { name: true, partnerName: true, instructions: true, validUntil: true } } },
    }),
  ]);
  if (!user) redirect("/login");

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <Link href="/passport" className="font-body text-sm text-stone/60 hover:text-rust">
          ← Your Passport
        </Link>
        <p className="mt-6 font-body text-sm text-rust">Taita Passport</p>
        <h1 className="mt-1 font-display text-4xl text-stone">Rewards</h1>
        <p className="mt-2 font-body text-stone/70">
          You have <strong className="text-stone">{user.points} points</strong> to spend. Earn more by checking in
          around Taita.
        </p>

        {/* VOUCHERS */}
        {vouchers.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl text-stone">Your vouchers</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {vouchers.map((v) => {
                const live = v.status === "ISSUED";
                return (
                  <div
                    key={v.id}
                    className={`rounded-sm border p-5 ${live ? "border-ochre bg-ochre/10" : "border-stone/10 opacity-60"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-display text-lg text-stone">{v.reward.name}</p>
                      <span
                        className={`rounded-full px-3 py-1 font-body text-xs ${
                          live ? "bg-canopy text-parchment" : "bg-stone/10 text-stone/70"
                        }`}
                      >
                        {redemptionStatusLabel(v.status)}
                      </span>
                    </div>
                    {v.reward.partnerName && (
                      <p className="font-body text-xs text-stone/50">Honoured by {v.reward.partnerName}</p>
                    )}
                    <p className="mt-3 font-display text-2xl tracking-wider text-stone">{v.code}</p>
                    {live && <p className="mt-2 font-body text-sm text-stone/70">{v.reward.instructions}</p>}
                    <p className="mt-2 font-body text-xs text-stone/50">
                      Redeemed {formatDate(v.createdAt)}
                      {v.reward.validUntil ? ` · valid until ${formatDate(v.reward.validUntil)}` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* AVAILABLE REWARDS */}
        <section className="mt-14">
          <h2 className="font-display text-2xl text-stone">Available rewards</h2>
          {rewards.length === 0 ? (
            <p className="mt-5 max-w-prose font-body text-stone/60">
              No rewards are available right now. Check back soon — keep checking in around Taita and your points
              will be waiting.
            </p>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rewards.map((r) => (
                <div key={r.id} className="flex flex-col overflow-hidden rounded-sm border border-stone/15">
                  {r.image && (
                    <div className="relative h-40 w-full bg-stone/10">
                      <Image
                        src={r.image}
                        alt={r.name}
                        fill
                        unoptimized={!canOptimize(r.image)}
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    {r.partnerName && <p className="font-body text-xs text-stone/50">{r.partnerName}</p>}
                    <p className="font-display text-xl text-stone">{r.name}</p>
                    <p className="mt-2 flex-1 font-body text-sm text-stone/70">{r.description}</p>
                    <p className="mt-4 font-display text-2xl text-rust">{r.pointsCost} points</p>
                    <p className="font-body text-xs text-stone/50">
                      {r.stock !== null && r.stock <= 5 ? `Only ${r.stock} left` : ""}
                      {r.stock !== null && r.stock <= 5 && r.validUntil ? " · " : ""}
                      {r.validUntil ? `Until ${formatDate(r.validUntil)}` : ""}
                    </p>
                    <div className="mt-4">
                      <RedeemButton
                        rewardId={r.id}
                        rewardName={r.name}
                        pointsCost={r.pointsCost}
                        balance={user.points}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
