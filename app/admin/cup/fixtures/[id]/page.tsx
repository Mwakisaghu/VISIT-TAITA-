import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FixtureForm from "@/components/admin/FixtureForm";

export default async function EditFixturePage({ params }: { params: { id: string } }) {
  const [fixture, teams, venues] = await Promise.all([
    prisma.sportFixture.findUnique({ where: { id: params.id } }),
    prisma.sportTeam.findMany({ orderBy: { name: "asc" } }),
    prisma.sportVenue.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!fixture) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit fixture</h1>
      <FixtureForm fixture={fixture} teams={teams} venues={venues} />
    </div>
  );
}
