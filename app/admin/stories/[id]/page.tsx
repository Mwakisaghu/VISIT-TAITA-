import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StoryForm from "@/components/admin/StoryForm";

export default async function EditStoryPage({ params }: { params: { id: string } }) {
  const story = await prisma.story.findUnique({ where: { id: params.id } });
  if (!story) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Edit story</h1>
      <StoryForm story={story} />
    </div>
  );
}
