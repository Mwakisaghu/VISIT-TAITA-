import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function PartnerDashboardPage() {
  const session = await getServerSession(authOptions);
  const sellerId = session!.user.id;

  const [total, published, draft] = await Promise.all([
    prisma.product.count({ where: { sellerId } }),
    prisma.product.count({ where: { sellerId, status: "PUBLISHED" } }),
    prisma.product.count({ where: { sellerId, status: "DRAFT" } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Welcome back</h1>
      <p className="mt-2 font-body text-stone/60">Here&apos;s how your Taita Made listings are doing.</p>

      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="rounded-sm border border-stone/10 p-5">
          <p className="font-display text-3xl text-stone">{total}</p>
          <p className="mt-1 font-body text-sm text-stone/60">Total listings</p>
        </div>
        <div className="rounded-sm border border-stone/10 p-5">
          <p className="font-display text-3xl text-stone">{published}</p>
          <p className="mt-1 font-body text-sm text-stone/60">Live in shop</p>
        </div>
        <div className="rounded-sm border border-stone/10 p-5">
          <p className="font-display text-3xl text-stone">{draft}</p>
          <p className="mt-1 font-body text-sm text-stone/60">Awaiting review</p>
        </div>
      </div>
    </div>
  );
}
