import { notFound } from "next/navigation";
import MakerForm from "@/components/admin/MakerForm";
import { prisma } from "@/lib/prisma";

export default async function EditMakerPage({ params }: { params: { id: string } }) {
  const maker = await prisma.maker.findUnique({ where: { id: params.id } });
  if (!maker) notFound();
  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit maker</h1>
      <MakerForm maker={maker} />
    </div>
  );
}
