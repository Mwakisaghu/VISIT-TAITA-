import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import VenueForm from "@/components/admin/VenueForm";

export default async function EditVenuePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const venue = await prisma.sportVenue.findUnique({ where: { id: params.id } });
  if (!venue) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit venue</h1>
      <VenueForm venue={venue} />
    </div>
  );
}
