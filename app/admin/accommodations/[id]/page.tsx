import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AccommodationForm from "@/components/admin/AccommodationForm";

export default async function EditAccommodationPage({ params }: { params: { id: string } }) {
  const accommodation = await prisma.accommodation.findUnique({ where: { id: params.id } });
  if (!accommodation) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit accommodation</h1>
      <AccommodationForm accommodation={accommodation} />
    </div>
  );
}
