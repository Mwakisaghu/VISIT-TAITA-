import type { Metadata } from "next";
import Link from "next/link";
import CreatorCard from "@/components/creators/CreatorCard";
import { prisma } from "@/lib/prisma";
import { TRACK_BLURBS, TRACK_LABELS } from "@/lib/creators";

export const metadata: Metadata = {
  title: "The Taita Field Crew",
  description: "The storytellers, photographers and filmmakers telling the story of Taita Taveta.",
};

// Same for every visitor, so it stays cached.
export const revalidate = 60;

export default async function CreatorsPage() {
  const creators = await prisma.creator.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ displayName: "asc" }],
  });
  const locals = creators.filter((c) => c.track === "LOCAL_VOICE");
  const visiting = creators.filter((c) => c.track === "VISITING_CREATOR");

  const sections = [
    { key: "LOCAL_VOICE" as const, list: locals },
    { key: "VISITING_CREATOR" as const, list: visiting },
  ].filter((s) => s.list.length > 0);

  return (
    <div>
      <section className="bg-stone px-6 py-20 text-parchment sm:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-sm tracking-wide text-ochre">Taita Field Crew</p>
          <h1 className="mt-3 font-display text-4xl sm:text-6xl">
            The people who tell
            <br />
            Taita&apos;s story.
          </h1>
          <p className="mt-5 max-w-lg font-body text-lg text-parchment/85">
            Local storytellers and visiting creators, working to one rule: show real evidence, and always say
            who made it possible.
          </p>
          <Link
            href="/creators/apply"
            className="focus-ring mt-8 inline-block rounded-full bg-rust px-7 py-3 font-body text-sm text-parchment transition-colors hover:bg-rust-deep"
          >
            Join the Field Crew
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-16">
        {sections.length === 0 ? (
          <div className="max-w-prose">
            <p className="font-display text-2xl text-stone">The Field Crew is forming.</p>
            <p className="mt-3 font-body text-stone/70">
              The first creators will appear here once they&apos;re approved. If you tell stories about Taita
              Taveta — as someone who lives here, or someone who loves it — we&apos;d like to hear from you.
            </p>
          </div>
        ) : (
          sections.map((s) => (
            <section key={s.key} className="mb-14 last:mb-0">
              <h2 className="font-display text-3xl text-stone">{TRACK_LABELS[s.key]}s</h2>
              <p className="mt-2 max-w-prose font-body text-sm text-stone/60">{TRACK_BLURBS[s.key]}</p>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {s.list.map((c) => (
                  <CreatorCard key={c.id} creator={c} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
