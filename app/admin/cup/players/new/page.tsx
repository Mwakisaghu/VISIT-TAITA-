import { prisma } from "@/lib/prisma";
import PlayerForm from "@/components/admin/PlayerForm";

export default async function NewPlayerPage() {
  const teams = await prisma.sportTeam.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">New player</h1>
      {teams.length > 0 ? (
        <PlayerForm teams={teams} />
      ) : (
        <p className="mt-6 font-body text-stone/60">Create a team first.</p>
      )}
    </div>
  );
}
