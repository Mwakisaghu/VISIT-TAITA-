import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StoryForm from "@/components/admin/StoryForm";

export default async function EditStoryPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const story = await prisma.story.findUnique({ where: { id: params.id } });
  if (!story) notFound();
  const destinations = await prisma.destination.findMany({ select: { id: true, name: true, region: true }, orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit story</h1>
      <StoryForm story={story} destinations={destinations} />
    </div>
  );
}
