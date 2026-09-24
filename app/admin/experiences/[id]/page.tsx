import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ExperienceForm from "@/components/admin/ExperienceForm";

export default async function EditExperiencePage({ params }: { params: { id: string } }) {
  const experience = await prisma.experience.findUnique({ where: { id: params.id } });
  if (!experience) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit experience</h1>
      <ExperienceForm experience={experience} />
    </div>
  );
}
