import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteReward } from "@/lib/actions/rewards-admin";

export default async function AdminRewardsPage() {
  const rewards = await prisma.reward.findMany({
    orderBy: [{ status: "asc" }, { pointsCost: "asc" }],
    include: { _count: { select: { redemptions: true } }, owner: { select: { name: true } } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-stone">Rewards</h1>
        <div className="flex gap-3">
          <Link
            href="/admin/rewards/redemptions"
            className="focus-ring rounded-full border border-stone/25 px-5 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust"
          >
            Vouchers
          </Link>
          <Link
            href="/admin/rewards/new"
            className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
          >
            New reward
          </Link>
        </div>
      </div>

      <div className="mt-8 divide-y divide-stone/10">
        {rewards.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {r.status} · {r.pointsCost} points · {r.stock === null ? "unlimited stock" : `${r.stock} left`} ·{" "}
                {r._count.redemptions} redeemed
                {r.partnerName ? ` · ${r.partnerName}` : ""}
                {r.owner ? ` · handled by ${r.owner.name}` : " · staff handle vouchers"}
              </p>
              <p className="font-display text-lg text-stone">{r.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/rewards/${r.id}`}
                className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
              >
                Edit
              </Link>
              {r._count.redemptions === 0 && (
                <form
                  action={async () => {
                    "use server";
                    await deleteReward(r.id);
                  }}
                >
                  <button type="submit" className="focus-ring font-body text-sm text-stone/40 hover:text-rust">
                    Delete
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {rewards.length === 0 && (
          <p className="py-8 font-body text-stone/50">
            No rewards yet. Add one once a partner has agreed to honour it.
          </p>
        )}
      </div>
    </div>
  );
}
