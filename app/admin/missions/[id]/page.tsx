import { notFound } from "next/navigation";
import MissionForm from "@/components/admin/MissionForm";
import { prisma } from "@/lib/prisma";

export default async function EditMissionPage({ params }: { params: { id: string } }) {
  const [mission, destinations, sponsors] = await Promise.all([
    prisma.mission.findUnique({ where: { id: params.id } }),
    prisma.destination.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true, checkinToken: true, latitude: true, longitude: true },
    }),
    prisma.sponsor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!mission) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit mission</h1>
      <MissionForm
        mission={mission}
        destinations={destinations.map((d) => ({
          id: d.id,
          name: d.name,
          status: d.status,
          hasCheckin: !!d.checkinToken || (d.latitude !== null && d.longitude !== null),
        }))}
        sponsors={sponsors}
      />
    </div>
  );
}
