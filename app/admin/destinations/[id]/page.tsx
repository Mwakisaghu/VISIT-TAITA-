import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DestinationForm from "@/components/admin/DestinationForm";

export default async function EditDestinationPage({ params }: { params: { id: string } }) {
  const destination = await prisma.destination.findUnique({ where: { id: params.id } });
  if (!destination) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit destination</h1>
      <DestinationForm destination={destination} />
    </div>
  );
}
