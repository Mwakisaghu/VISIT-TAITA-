import { prisma } from "@/lib/prisma";

export interface StandingRow {
  teamId: string;
  teamName: string;
  teamSlug: string;
  crest: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export async function getStandings(): Promise<StandingRow[]> {
  const teams = await prisma.sportTeam.findMany();
  const finished = await prisma.sportFixture.findMany({
    where: { status: "FINISHED", homeScore: { not: null }, awayScore: { not: null } },
  });

  const table = new Map<string, StandingRow>(
    teams.map((t) => [
      t.id,
      {
        teamId: t.id,
        teamName: t.name,
        teamSlug: t.slug,
        crest: t.crest,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      },
    ])
  );

  for (const fixture of finished) {
    const home = table.get(fixture.homeTeamId);
    const away = table.get(fixture.awayTeamId);
    if (!home || !away) continue;

    const hs = fixture.homeScore as number;
    const as = fixture.awayScore as number;

    home.played += 1;
    away.played += 1;
    home.goalsFor += hs;
    home.goalsAgainst += as;
    away.goalsFor += as;
    away.goalsAgainst += hs;

    if (hs > as) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (hs < as) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const row of table.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  return Array.from(table.values()).sort(
    (a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor
  );
}
