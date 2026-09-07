import Link from "next/link";
import Hero from "@/components/Hero";
import SectionHeading from "@/components/SectionHeading";
import StoryCard from "@/components/StoryCard";
import EventStrip from "@/components/EventStrip";
import Newsletter from "@/components/Newsletter";
import DemoNotice from "@/components/DemoNotice";
import { discoverCategories } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const [stories, events] = await Promise.all([
    prisma.story.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 3,
    }),
    prisma.event.findMany({
      where: { status: "PUBLISHED", eventDate: { gte: new Date() } },
      orderBy: { eventDate: "asc" },
      take: 3,
    }),
  ]);

  const hasDemoStories = stories.some((s) => s.isDemo);

  return (
    <>
      <Hero />

      {/* DISCOVER TAITA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            title="Discover Taita"
            description="Six ways into the same place. Start wherever pulls you in."
          />
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
            {discoverCategories.map((cat) => (
              <Link
                key={cat.key}
                href={`/discover/${cat.key}`}
                className="focus-ring group block"
              >
                <div className="flex h-32 items-end rounded-sm bg-stone p-4 transition-colors group-hover:bg-canopy sm:h-40">
                  <p className="font-display text-2xl text-parchment">{cat.label}</p>
                </div>
                <p className="mt-2 font-body text-sm text-stone/60">{cat.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TAITA STORIES */}
      {stories.length > 0 && (
        <section className="bg-parchment-dim/40 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-end justify-between gap-6">
              <SectionHeading
                title="Taita Stories"
                description="The people, culture and places behind the postcard."
              />
              <Link
                href="/stories"
                className="focus-ring hidden shrink-0 rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone transition-colors hover:border-rust hover:text-rust sm:inline-block"
              >
                All stories
              </Link>
            </div>

            <div className="mt-10 grid gap-10 md:grid-cols-3">
              <div className="md:col-span-2">
                <StoryCard story={stories[0]} size="large" />
              </div>
              <div className="flex flex-col gap-10">
                {stories.slice(1).map((story) => (
                  <StoryCard key={story.slug} story={story} />
                ))}
              </div>
            </div>
            {hasDemoStories && (
              <DemoNotice>replace with verified stories before launch.</DemoNotice>
            )}
          </div>
        </section>
      )}

      {/* THIS WEEK IN TAITA */}
      {events.length > 0 && (
        <section className="px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <SectionHeading title="This week in Taita" />
            <div className="mt-8">
              {events.map((event) => (
                <EventStrip key={event.slug} event={event} />
              ))}
            </div>
            <Link
              href="/events"
              className="focus-ring mt-6 inline-block font-body text-sm text-rust hover:text-rust-deep"
            >
              See everything on
            </Link>
          </div>
        </section>
      )}

      {/* TAITA CUP teaser */}
      <section className="bg-canopy px-6 py-20 text-parchment">
        <div className="mx-auto max-w-6xl">
          <p className="font-display text-3xl sm:text-4xl">
            Come for the football.
            <br />
            Stay for Taita.
          </p>
          <p className="mt-4 max-w-md font-body text-parchment/80">
            Taita Cup brings teams, travel packages and match-day festivities
            to the hills every season.
          </p>
        </div>
      </section>

      {/* PASSPORT teaser */}
      <section id="passport" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            title="The Taita Passport"
            description="Track what you've done, collect badges, and earn your way to Taita Legend status."
          />
          <Link
            href="/register"
            className="focus-ring mt-6 inline-block rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
          >
            Start your Passport
          </Link>
        </div>
      </section>

      <Newsletter />
    </>
  );
}
