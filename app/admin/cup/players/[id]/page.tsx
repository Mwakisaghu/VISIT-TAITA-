import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PlayerForm from "@/components/admin/PlayerForm";

export default async function EditPlayerPage({ params }: { params: { id: string } }) {
  const [player, teams] = await Promise.all([
    prisma.sportPlayer.findUnique({ where: { id: params.id } }),
    prisma.sportTeam.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!player) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit player</h1>
      <PlayerForm player={player} teams={teams} />
    </div>
  );
}
