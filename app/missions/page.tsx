import type { Metadata } from "next";
import Link from "next/link";
import MissionCard from "@/components/missions/MissionCard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Field Crew missions",
  description: "Briefs for the people who tell Taita's story — each tied to a real place, with the evidence a note should show.",
};

// Same for every visitor, so it stays cached.
export const revalidate = 60;

const include = { destination: { select: { name: true } }, sponsor: { select: { name: true } } } as const;

export default async function MissionsPage() {
  const now = new Date();
  const [open, closed] = await Promise.all([
    prisma.mission.findMany({
      where: { status: "OPEN", OR: [{ closesAt: null }, { closesAt: { gt: now } }] },
      orderBy: [{ closesAt: "asc" }, { createdAt: "desc" }],
      include,
    }),
    prisma.mission.findMany({
      where: { status: "CLOSED" },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include,
    }),
  ]);

  return (
    <div>
      <section className="bg-stone px-6 py-20 text-parchment sm:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="font-body text-sm tracking-wide text-ochre">Taita Field Crew</p>
          <h1 className="mt-3 font-display text-4xl sm:text-6xl">
            Missions.
            <br />
            Go there. Show us.
          </h1>
          <p className="mt-5 max-w-lg font-body text-lg text-parchment/85">
            Each mission is tied to a real place and says exactly what a good note should show. Hosted and
            sponsored missions are labelled up front, and creators disclose them in every post.
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
        <h2 className="font-display text-3xl text-stone">Open now</h2>
        {open.length === 0 ? (
          <p className="mt-4 max-w-prose font-body text-stone/60">
            No missions are open right now. New briefs are added regularly — join the Field Crew to be among the first to hear.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
          </div>
        )}

        {closed.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl text-stone/70">Recently closed</h2>
            <div className="mt-6 grid gap-6 opacity-70 sm:grid-cols-2 lg:grid-cols-3">
              {closed.map((m) => (
                <MissionCard key={m.id} mission={m} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
