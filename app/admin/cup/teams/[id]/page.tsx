import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TeamForm from "@/components/admin/TeamForm";

export default async function EditTeamPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const team = await prisma.sportTeam.findUnique({ where: { id: params.id } });
  if (!team) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit team</h1>
      <TeamForm team={team} />
    </div>
  );
}
