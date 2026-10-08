import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { redemptionStatusLabel } from "@/lib/rewards";
import { holderLabel, normalizeVoucherCode } from "@/lib/voucher-lookup";
import MarkUsedButton from "@/components/partners/MarkUsedButton";

export const metadata: Metadata = { title: "Vouchers" };
export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function PartnerVouchersPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const isAdmin = ADMIN_ROLES.includes(session!.user.role);
  // Partners only ever see vouchers for rewards assigned to them.
  const ownership = isAdmin ? {} : { reward: { ownerId: userId } };

  const typed = (searchParams.code ?? "").trim();
  const code = normalizeVoucherCode(typed);
  const limited = typed !== "" && code !== null && !await checkRateLimit(`voucher-lookup:${userId}`, 30, 60 * 1000);

  const found =
    code && !limited
      ? await prisma.rewardRedemption.findFirst({
          where: { code, ...ownership },
          include: {
            reward: { select: { name: true, partnerName: true, instructions: true, validUntil: true } },
            user: { select: { name: true } },
          },
        })
      : null;

  const recent = await prisma.rewardRedemption.findMany({
    where: ownership,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { reward: { select: { name: true } }, user: { select: { name: true } } },
  });

  const expired = !!found?.reward.validUntil && found.reward.validUntil.getTime() < Date.now();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Vouchers</h1>
      <p className="mt-2 max-w-prose font-body text-stone/70">
        When a visitor shows you a Visit Taita voucher, enter its code to check it before you honour it.
      </p>

      <form method="get" className="mt-6 flex max-w-md items-end gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="font-body text-sm text-stone/70">Voucher code</span>
          <input
            name="code"
            defaultValue={typed}
            placeholder="TAITA-K7M2QX"
            autoComplete="off"
            autoCapitalize="characters"
            className="input uppercase tracking-wider"
          />
        </label>
        <button
          type="submit"
          className="focus-ring rounded-full bg-rust px-6 py-2.5 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          Check
        </button>
      </form>

      {/* RESULT */}
      {typed !== "" && (
        <div className="mt-6 max-w-xl">
          {code === null ? (
            <p role="alert" className="rounded-sm border border-rust/40 bg-rust/10 p-4 font-body text-sm text-stone">
              That doesn&apos;t look like a Visit Taita voucher code. Codes look like TAITA-K7M2QX.
            </p>
          ) : limited ? (
            <p role="alert" className="rounded-sm border border-ochre/50 bg-ochre/10 p-4 font-body text-sm text-stone">
              Too many lookups — please wait a minute and try again.
            </p>
          ) : !found ? (
            <p role="alert" className="rounded-sm border border-rust/40 bg-rust/10 p-4 font-body text-sm text-stone">
              No voucher with that code for your rewards. Check the code with the visitor.
            </p>
          ) : (
            <div
              className={`rounded-sm border p-5 ${
                found.status === "ISSUED" && !expired
                  ? "border-canopy/40 bg-canopy/10"
                  : "border-rust/40 bg-rust/10"
              }`}
            >
              <p className="font-display text-lg text-stone">
                {found.status === "ISSUED" && !expired && "✓ Valid — ready to honour"}
                {found.status === "ISSUED" && expired && "⚠ This reward has expired"}
                {found.status === "USED" && `Already used${found.usedAt ? ` on ${formatDate(found.usedAt)}` : ""}`}
                {found.status === "CANCELLED" && "✗ Cancelled — do not honour"}
              </p>
              <p className="mt-3 font-display text-2xl tracking-wider text-stone">{found.code}</p>
              <p className="mt-2 font-body text-stone">{found.reward.name}</p>
              <p className="font-body text-sm text-stone/70">
                Holder: {holderLabel(found.user.name)} · redeemed {formatDate(found.createdAt)}
                {found.reward.validUntil ? ` · valid until ${formatDate(found.reward.validUntil)}` : ""}
              </p>
              {found.status === "ISSUED" && (!expired || isAdmin) && (
                <>
                  <p className="mt-3 font-body text-sm text-stone/70">{found.reward.instructions}</p>
                  <div className="mt-4">
                    <MarkUsedButton redemptionId={found.id} />
                  </div>
                </>
              )}
              {found.status === "ISSUED" && expired && !isAdmin && (
                <p className="mt-3 font-body text-sm text-stone/70">
                  Please check with Visit Taita before honouring this voucher.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* RECENT */}
      <h2 className="mt-12 font-display text-2xl text-stone">Recent vouchers</h2>
      <div className="mt-4 divide-y divide-stone/10">
        {recent.map((v) => (
          <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-display text-lg tracking-wider text-stone">{v.code}</p>
              <p className="font-body text-sm text-stone/70">
                {v.reward.name} · {holderLabel(v.user.name)} · {formatDate(v.createdAt)} ·{" "}
                {redemptionStatusLabel(v.status)}
              </p>
            </div>
            {v.status === "ISSUED" && <MarkUsedButton redemptionId={v.id} />}
          </div>
        ))}
        {recent.length === 0 && (
          <p className="py-6 font-body text-stone/50">
            No vouchers yet. They appear here when visitors redeem rewards you honour.
          </p>
        )}
      </div>
    </div>
  );
}
