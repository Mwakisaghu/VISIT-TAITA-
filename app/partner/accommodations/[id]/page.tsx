import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PartnerAccommodationForm from "@/components/partners/PartnerAccommodationForm";

export default async function EditPartnerAccommodationPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const isAdmin = ADMIN_ROLES.includes(session!.user.role);

  const accommodation = await prisma.accommodation.findUnique({ where: { id: params.id } });
  if (!accommodation) notFound();
  if (!isAdmin && accommodation.ownerId !== session!.user.id) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit accommodation</h1>
      <PartnerAccommodationForm accommodation={accommodation} />
    </div>
  );
}
