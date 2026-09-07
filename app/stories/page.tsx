import type { Metadata } from "next";
import SectionHeading from "@/components/SectionHeading";
import StoryCard from "@/components/StoryCard";
import DemoNotice from "@/components/DemoNotice";
import { stories } from "@/lib/data";

export const metadata: Metadata = {
  title: "Taita Stories",
  description: "People, places, culture, sport and adventure from Taita Taveta.",
};

export default function StoriesPage() {
  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          title="Taita Stories"
          description="The people, culture and places behind the postcard."
        />

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <StoryCard key={story.slug} story={story} />
          ))}
        </div>

        <div className="mt-10">
          <DemoNotice>replace with verified editorial before launch.</DemoNotice>
        </div>
      </div>
    </div>
  );
}
