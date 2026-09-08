import type { Metadata } from "next";
import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";
import StandingsTable from "@/components/cup/StandingsTable";
import FixtureRow from "@/components/cup/FixtureRow";
import DemoNotice from "@/components/DemoNotice";
import { getStandings } from "@/lib/cup";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Taita Cup",
  description: "Teams, fixtures, results and standings for the Taita Cup.",
};

export default async function TaitaCupPage() {
  const [standings, upcoming, results, teams] = await Promise.all([
    getStandings(),
    prisma.sportFixture.findMany({
      where: { status: "SCHEDULED" },
      include: { homeTeam: true, awayTeam: true, venue: true },
      orderBy: { kickoff: "asc" },
      take: 6,
    }),
    prisma.sportFixture.findMany({
      where: { status: "FINISHED" },
      include: { homeTeam: true, awayTeam: true, venue: true },
      orderBy: { kickoff: "desc" },
      take: 6,
    }),
    prisma.sportTeam.findMany({ orderBy: { name: "asc" } }),
  ]);

  const hasDemo = teams.some((t) => t.isDemo);

  return (
    <div>
      {/* HEADER */}
      <section className="bg-canopy px-6 py-20 text-parchment">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-sm text-ochre">Taita Sport</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">
            Come for the football.
            <br />
            Stay for Taita.
          </h1>
          <p className="mt-4 max-w-md font-body text-parchment/80">
            Teams from across the hills and plains, playing for the Taita Cup —
            with travel packages built around every matchday.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-16 lg:grid-cols-3">
          {/* STANDINGS */}
          <div className="lg:col-span-2">
            <SectionHeading title="Standings" />
            <div className="mt-6">
              <StandingsTable rows={standings} />
            </div>

            <div className="mt-16">
              <SectionHeading title="Upcoming fixtures" />
              <div className="mt-6">
                {upcoming.length > 0 ? (
                  upcoming.map((f) => <FixtureRow key={f.id} fixture={f} />)
                ) : (
                  <p className="font-body text-stone/50">No fixtures scheduled yet.</p>
                )}
              </div>
            </div>

            <div className="mt-16">
              <SectionHeading title="Recent results" />
              <div className="mt-6">
                {results.length > 0 ? (
                  results.map((f) => <FixtureRow key={f.id} fixture={f} />)
                ) : (
                  <p className="font-body text-stone/50">No results yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* TEAMS */}
          <div>
            <SectionHeading title="Teams" />
            <div className="mt-6 flex flex-col gap-3">
              {teams.map((team) => (
                <Link
                  key={team.slug}
                  href={`/events/taita-cup/teams/${team.slug}`}
                  className="focus-ring flex items-center gap-3 rounded-sm border border-stone/10 px-4 py-3 hover:border-rust"
                >
                  <span className="text-xl">{team.crest}</span>
                  <div>
                    <p className="font-display text-stone">{team.name}</p>
                    <p className="font-body text-xs text-stone/50">{team.town}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {hasDemo && (
          <div className="mt-16">
            <DemoNotice>fictional demo clubs and results, for layout only.</DemoNotice>
          </div>
        )}
      </div>
    </div>
  );
}
