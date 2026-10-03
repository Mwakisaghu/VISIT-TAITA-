import { prisma } from "@/lib/prisma";
import SponsorForm from "@/components/admin/SponsorForm";

export default async function NewSponsorPage() {
  const packages = await prisma.sponsorPackage.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Add sponsor</h1>
      <SponsorForm packages={packages} />
    </div>
  );
}
