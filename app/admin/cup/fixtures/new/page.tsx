import { prisma } from "@/lib/prisma";
import FixtureForm from "@/components/admin/FixtureForm";

export default async function NewFixturePage() {
  const [teams, venues] = await Promise.all([
    prisma.sportTeam.findMany({ orderBy: { name: "asc" } }),
    prisma.sportVenue.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">New fixture</h1>
      {teams.length >= 2 && venues.length >= 1 ? (
        <FixtureForm teams={teams} venues={venues} />
      ) : (
        <p className="mt-6 font-body text-stone/60">
          You need at least two teams and one venue before you can schedule a
          fixture.
        </p>
      )}
    </div>
  );
}
