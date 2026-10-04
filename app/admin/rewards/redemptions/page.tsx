import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { REDEMPTION_STATUSES, redemptionStatusLabel } from "@/lib/rewards";
import RedemptionActions from "@/components/admin/RedemptionActions";

export default async function AdminRedemptionsPage({
  searchParams,
}: {
  searchParams: { code?: string; status?: string };
}) {
  const code = (searchParams.code ?? "").trim().toUpperCase();
  const status = REDEMPTION_STATUSES.find((s) => s === searchParams.status);

  const vouchers = await prisma.rewardRedemption.findMany({
    where: {
      ...(code ? { code: { contains: code } } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { name: true, email: true } },
      reward: { select: { name: true, partnerName: true } },
    },
  });

  return (
    <div>
      <Link href="/admin/rewards" className="font-body text-sm text-stone/60 hover:text-rust">
        ← Rewards
      </Link>
      <h1 className="mt-3 font-display text-3xl text-stone">Vouchers</h1>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-stone/60">Find by code</span>
          <input name="code" defaultValue={code} placeholder="TAITA-" className="input uppercase" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-stone/60">Status</span>
          <select name="status" defaultValue={status ?? ""} className="input">
            <option value="">All</option>
            {REDEMPTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {redemptionStatusLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="focus-ring rounded-full bg-stone px-5 py-2 font-body text-sm text-parchment hover:bg-stone-soft"
        >
          Search
        </button>
      </form>

      <div className="mt-8 divide-y divide-stone/10">
        {vouchers.map((v) => (
          <div key={v.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="font-display text-lg tracking-wider text-stone">{v.code}</p>
              <p className="font-body text-sm text-stone/70">
                {v.reward.name}
                {v.reward.partnerName ? ` · ${v.reward.partnerName}` : ""} · {v.pointsSpent} points
              </p>
              <p className="font-body text-xs text-stone/50">
                {v.user.name} · {v.user.email} · {v.createdAt.toLocaleString()} · {redemptionStatusLabel(v.status)}
                {v.usedAt ? ` (${v.usedAt.toLocaleDateString()})` : ""}
              </p>
            </div>
            <RedemptionActions redemptionId={v.id} status={v.status} pointsSpent={v.pointsSpent} />
          </div>
        ))}
        {vouchers.length === 0 && <p className="py-8 font-body text-stone/50">No vouchers match.</p>}
        {vouchers.length === 200 && (
          <p className="py-4 font-body text-xs text-stone/40">Showing the latest 200 — narrow with the search above.</p>
        )}
      </div>
    </div>
  );
}
