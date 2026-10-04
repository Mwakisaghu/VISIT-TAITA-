import Link from "next/link";
import MissionStatusButtons from "@/components/admin/MissionStatusButtons";
import { formatDeadline, missionStatusLabel, missionSupportLabel } from "@/lib/missions";
import { prisma } from "@/lib/prisma";

export default async function AdminMissionsPage() {
  const missions = await prisma.mission.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { destination: { select: { name: true } }, _count: { select: { claims: true } } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-stone">Missions</h1>
        <Link href="/admin/missions/new" className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep">
          New mission
        </Link>
      </div>

      <div className="mt-8 divide-y divide-stone/10">
        {missions.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {missionStatusLabel(m.status)} · {missionSupportLabel(m.support)} · 📍 {m.destination.name} ·{" "}
                {m.maxCreators === null ? `${m.spotsTaken} taking part` : `${m.spotsTaken}/${m.maxCreators} spots`} · {m._count.claims} claim
                {m._count.claims === 1 ? "" : "s"}
                {m.closesAt ? ` · closes ${formatDeadline(m.closesAt)}` : ""}
              </p>
              <Link href={`/admin/missions/${m.id}`} className="font-display text-lg text-stone hover:text-rust">
                {m.title}
              </Link>
            </div>
            <MissionStatusButtons missionId={m.id} status={m.status} claimCount={m._count.claims} />
          </div>
        ))}
        {missions.length === 0 && <p className="py-8 font-body text-stone/50">No missions yet.</p>}
      </div>
    </div>
  );
}
