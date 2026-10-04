import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RewardForm from "@/components/admin/RewardForm";

export default async function EditRewardPage({ params }: { params: { id: string } }) {
  const [reward, partners] = await Promise.all([
    prisma.reward.findUnique({ where: { id: params.id } }),
    prisma.user.findMany({
      where: { role: { in: ["PARTNER", "SELLER"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!reward) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit reward</h1>
      <RewardForm reward={reward} partners={partners} />
    </div>
  );
}
