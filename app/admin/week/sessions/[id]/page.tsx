import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FestivalSessionForm from "@/components/admin/FestivalSessionForm";

export default async function EditFestivalSessionPage({ params }: { params: { id: string } }) {
  const [session, venues] = await Promise.all([
    prisma.festivalSession.findUnique({ where: { id: params.id } }),
    prisma.festivalVenue.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!session) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit session</h1>
      <FestivalSessionForm session={session} venues={venues} />
    </div>
  );
}
