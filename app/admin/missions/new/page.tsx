import MissionForm from "@/components/admin/MissionForm";
import { prisma } from "@/lib/prisma";

export default async function NewMissionPage() {
  const [destinations, sponsors] = await Promise.all([
    prisma.destination.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true, checkinToken: true, latitude: true, longitude: true },
    }),
    prisma.sponsor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">New mission</h1>
      <MissionForm
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
