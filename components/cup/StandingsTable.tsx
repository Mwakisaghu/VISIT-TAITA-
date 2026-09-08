import Link from "next/link";
import type { StandingRow } from "@/lib/cup";

export default function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] font-body text-sm">
        <thead>
          <tr className="border-b border-stone/20 text-left text-stone/50">
            <th className="py-2 pr-4 font-normal">Team</th>
            <th className="px-2 py-2 text-center font-normal">P</th>
            <th className="px-2 py-2 text-center font-normal">W</th>
            <th className="px-2 py-2 text-center font-normal">D</th>
            <th className="px-2 py-2 text-center font-normal">L</th>
            <th className="px-2 py-2 text-center font-normal">GD</th>
            <th className="px-2 py-2 text-center font-normal">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.teamId} className="border-b border-stone/10">
              <td className="py-3 pr-4">
                <Link href={`/events/taita-cup/teams/${row.teamSlug}`} className="focus-ring flex items-center gap-3 hover:text-rust">
                  <span className="w-4 text-stone/40">{i + 1}</span>
                  <span>{row.crest}</span>
                  <span className="font-display text-base text-stone">{row.teamName}</span>
                </Link>
              </td>
              <td className="px-2 py-3 text-center text-stone/70">{row.played}</td>
              <td className="px-2 py-3 text-center text-stone/70">{row.won}</td>
              <td className="px-2 py-3 text-center text-stone/70">{row.drawn}</td>
              <td className="px-2 py-3 text-center text-stone/70">{row.lost}</td>
              <td className="px-2 py-3 text-center text-stone/70">
                {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
              </td>
              <td className="px-2 py-3 text-center font-display text-stone">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
