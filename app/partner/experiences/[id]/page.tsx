import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PartnerExperienceForm from "@/components/partners/PartnerExperienceForm";

export default async function EditPartnerExperiencePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const isAdmin = ADMIN_ROLES.includes(session!.user.role);

  const experience = await prisma.experience.findUnique({ where: { id: params.id } });
  if (!experience) notFound();
  if (!isAdmin && experience.ownerId !== session!.user.id) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit experience</h1>
      <PartnerExperienceForm experience={experience} />
    </div>
  );
}
