import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SponsorForm from "@/components/admin/SponsorForm";

export default async function EditSponsorPage({ params }: { params: { id: string } }) {
  const [sponsor, packages] = await Promise.all([
    prisma.sponsor.findUnique({ where: { id: params.id } }),
    prisma.sponsorPackage.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  if (!sponsor) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit sponsor</h1>
      <SponsorForm sponsor={sponsor} packages={packages} />
    </div>
  );
}
