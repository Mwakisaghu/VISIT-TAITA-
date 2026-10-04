import { prisma } from "@/lib/prisma";
import RewardForm from "@/components/admin/RewardForm";

export default async function NewRewardPage() {
  const partners = await prisma.user.findMany({
    where: { role: { in: ["PARTNER", "SELLER"] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">New reward</h1>
      <RewardForm partners={partners} />
    </div>
  );
}
