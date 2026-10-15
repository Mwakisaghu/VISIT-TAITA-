import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FestivalVenueForm from "@/components/admin/FestivalVenueForm";

export default async function EditFestivalVenuePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const venue = await prisma.festivalVenue.findUnique({ where: { id: params.id } });
  if (!venue) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit venue</h1>
      <FestivalVenueForm venue={venue} />
    </div>
  );
}
