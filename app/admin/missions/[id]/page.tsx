import { notFound } from "next/navigation";
import MissionForm from "@/components/admin/MissionForm";
import { prisma } from "@/lib/prisma";

export default async function EditMissionPage({ params }: { params: { id: string } }) {
  const mission = await prisma.mission.findUnique({ where: { id: params.id } });
  if (!mission) notFound();

  // A featured listing that has since been unpublished stays selectable (and is labelled), so it can be seen and changed.
  const [destinations, sponsors, stays, experiences] = await Promise.all([
    prisma.destination.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true, checkinToken: true, latitude: true, longitude: true },
    }),
    prisma.sponsor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.accommodation.findMany({
      where: { OR: [{ status: "PUBLISHED" }, ...(mission.accommodationId ? [{ id: mission.accommodationId }] : [])] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true },
    }),
    prisma.experience.findMany({
      where: { OR: [{ status: "PUBLISHED" }, ...(mission.experienceId ? [{ id: mission.experienceId }] : [])] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true },
    }),
  ]);

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
        stays={stays}
        experiences={experiences}
      />
    </div>
  );
}
