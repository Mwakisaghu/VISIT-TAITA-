import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RewardForm from "@/components/admin/RewardForm";

export default async function EditRewardPage({ params }: { params: { id: string } }) {
  const reward = await prisma.reward.findUnique({ where: { id: params.id } });
  if (!reward) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit reward</h1>
      <RewardForm reward={reward} />
    </div>
  );
}
