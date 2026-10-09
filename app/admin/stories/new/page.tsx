import { prisma } from "@/lib/prisma";
import StoryForm from "@/components/admin/StoryForm";

export default async function NewStoryPage() {
  const destinations = await prisma.destination.findMany({ select: { id: true, name: true, region: true }, orderBy: { name: "asc" } });
  return (
    <div>
      <h1 className="font-display text-3xl text-stone">New story</h1>
      <StoryForm destinations={destinations} />
    </div>
  );
}
