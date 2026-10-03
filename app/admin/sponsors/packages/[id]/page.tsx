import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SponsorPackageForm from "@/components/admin/SponsorPackageForm";

export default async function EditSponsorPackagePage({ params }: { params: { id: string } }) {
  const sponsorPackage = await prisma.sponsorPackage.findUnique({ where: { id: params.id } });
  if (!sponsorPackage) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit package</h1>
      <SponsorPackageForm sponsorPackage={sponsorPackage} />
    </div>
  );
}
