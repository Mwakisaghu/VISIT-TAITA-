import type { Metadata } from "next";
import SectionHeading from "@/components/SectionHeading";
import StoryCard from "@/components/StoryCard";
import DemoNotice from "@/components/DemoNotice";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Taita Stories",
  description: "People, places, culture, sport and adventure from Taita Taveta.",
};

export const revalidate = 60;

export default async function StoriesPage() {
  const stories = await prisma.story.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });
  const hasDemo = stories.some((s) => s.isDemo);

  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          title="Taita Stories"
          description="The people, culture and places behind the postcard."
        />

        {stories.length > 0 ? (
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <StoryCard key={story.slug} story={story} />
            ))}
          </div>
        ) : (
          <p className="mt-10 font-body text-stone/60">No stories published yet.</p>
        )}

        {hasDemo && (
          <div className="mt-10">
            <DemoNotice>replace with verified editorial before launch.</DemoNotice>
          </div>
        )}
      </div>
    </div>
  );
}
