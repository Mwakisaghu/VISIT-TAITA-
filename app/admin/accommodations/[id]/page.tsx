import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AccommodationForm from "@/components/admin/AccommodationForm";

export default async function EditAccommodationPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const accommodation = await prisma.accommodation.findUnique({ where: { id: params.id } });
  if (!accommodation) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit accommodation</h1>
      <AccommodationForm accommodation={accommodation} />
    </div>
  );
}
