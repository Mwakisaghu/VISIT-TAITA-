import Link from "next/link";
import { formatCount } from "@/lib/impact";
import { getMissionImpacts, getProgrammeTotals } from "@/lib/impact-data";
import { missionStatusLabel } from "@/lib/missions";
import { prisma } from "@/lib/prisma";

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-stone/15 p-4">
      <p className="font-display text-3xl text-stone">{value}</p>
      <p className="mt-1 font-body text-xs text-stone/60">{label}</p>
    </div>
  );
}

export default async function AdminImpactPage() {
  const [totals, missions, sponsors] = await Promise.all([
    getProgrammeTotals(),
    prisma.mission.findMany({
      where: { status: { in: ["OPEN", "CLOSED"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, title: true, status: true, destination: { select: { name: true } } },
    }),
    prisma.sponsor.findMany({
      where: { missions: { some: { support: "SPONSORED", status: { in: ["OPEN", "CLOSED"] } } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, reportToken: true },
    }),
  ]);
  const impacts = await getMissionImpacts(missions.map((m) => m.id));

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Impact</h1>
      <p className="mt-2 max-w-prose font-body text-sm text-stone/60">
        What the Field Crew has produced. Views are approximate (counted from browsers, excluding staff and obvious bots). The visitor
        figures are context, not proof that a note caused a visit.
      </p>

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Active creators" value={formatCount(totals.creators)} />
        <Tile label="Open missions" value={formatCount(totals.openMissions)} />
        <Tile label="Missions claimed" value={formatCount(totals.claims)} />
        <Tile label="Notes published" value={formatCount(totals.notes)} />
        <Tile label="Page views (approx.)" value={formatCount(totals.views)} />
        <Tile label="Points awarded" value={formatCount(totals.pointsAwarded)} />
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl text-stone">Missions</h2>
        {missions.length === 0 ? (
          <p className="mt-3 font-body text-stone/50">No missions have been opened yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left font-body text-sm">
              <thead>
                <tr className="border-b border-stone/15 text-xs text-stone/50">
                  <th className="py-2 pr-4 font-normal">Mission</th>
                  <th className="py-2 pr-4 font-normal">Claims</th>
                  <th className="py-2 pr-4 font-normal">Notes</th>
                  <th className="py-2 pr-4 font-normal">Views</th>
                  <th className="py-2 pr-4 font-normal">New visitors (before → after)</th>
                  <th className="py-2 font-normal">Points</th>
                </tr>
              </thead>
              <tbody>
                {missions.map((m) => {
                  const i = impacts.get(m.id);
                  return (
                    <tr key={m.id} className="border-b border-stone/10 align-top">
                      <td className="py-3 pr-4">
                        <Link href={`/admin/missions/${m.id}`} className="font-display text-base text-stone hover:text-rust">
                          {m.title}
                        </Link>
                        <p className="text-xs text-stone/50">
                          {missionStatusLabel(m.status)} · 📍 {m.destination.name}
                        </p>
                      </td>
                      <td className="py-3 pr-4">{formatCount(i?.claims ?? 0)}</td>
                      <td className="py-3 pr-4">{formatCount(i?.notes ?? 0)}</td>
                      <td className="py-3 pr-4">{formatCount(i?.views ?? 0)}</td>
                      <td className="py-3 pr-4">
                        {i && i.visitorsBefore !== null && i.visitorsAfter !== null ? `${i.visitorsBefore} → ${i.visitorsAfter} (${i.windowDays}d)` : "—"}
                      </td>
                      <td className="py-3">{formatCount(i?.pointsAwarded ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl text-stone">Sponsor reports</h2>
        {sponsors.length === 0 ? (
          <p className="mt-3 font-body text-stone/50">A report appears here once a sponsored mission has been opened.</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone/10">
            {sponsors.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="font-display text-lg text-stone">{s.name}</span>
                <span className="flex items-center gap-4">
                  <span className="font-body text-xs text-stone/50">{s.reportToken ? "Shareable link on" : "No shareable link"}</span>
                  <Link href={`/admin/impact/sponsors/${s.id}`} className="focus-ring rounded-full border border-stone/25 px-4 py-1.5 font-body text-sm text-stone hover:border-rust hover:text-rust">
                    Open report
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
