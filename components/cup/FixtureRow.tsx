import type { SportFixture, SportTeam, SportVenue } from "@prisma/client";

type FixtureWithRelations = SportFixture & {
  homeTeam: SportTeam;
  awayTeam: SportTeam;
  venue: SportVenue;
};

export default function FixtureRow({ fixture }: { fixture: FixtureWithRelations }) {
  const played = fixture.status === "FINISHED";

  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone/10 py-4">
      <div className="flex flex-1 items-center justify-end gap-2 text-right">
        <span className="font-display text-stone">{fixture.homeTeam.name}</span>
        <span className="text-lg">{fixture.homeTeam.crest}</span>
      </div>

      <div className="shrink-0 text-center">
        {played ? (
          <p className="font-display text-lg text-stone">
            {fixture.homeScore} – {fixture.awayScore}
          </p>
        ) : (
          <p className="font-body text-xs text-stone/50">
            {fixture.kickoff.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
        )}
        <p className="mt-0.5 font-body text-[11px] text-stone/40">{fixture.venue.name}</p>
      </div>

      <div className="flex flex-1 items-center gap-2">
        <span className="text-lg">{fixture.awayTeam.crest}</span>
        <span className="font-display text-stone">{fixture.awayTeam.name}</span>
      </div>
    </div>
  );
}
