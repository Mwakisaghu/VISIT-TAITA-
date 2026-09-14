import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SectionHeading from "@/components/SectionHeading";
import FixtureRow from "@/components/cup/FixtureRow";
import DemoNotice from "@/components/DemoNotice";
import { prisma } from "@/lib/prisma";

export async function generateStaticParams() {
  const teams = await prisma.sportTeam.findMany({ select: { slug: true } });
  return teams.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const team = await prisma.sportTeam.findUnique({ where: { slug: params.slug } });
  if (!team) return {};
  return { title: team.name };
}

export const revalidate = 60;

export default async function TeamPage({ params }: { params: { slug: string } }) {
  const team = await prisma.sportTeam.findUnique({
    where: { slug: params.slug },
    include: { players: { orderBy: { number: "asc" } } },
  });
  if (!team) notFound();

  const fixtures = await prisma.sportFixture.findMany({
    where: { OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }] },
    include: { homeTeam: true, awayTeam: true, venue: true },
    orderBy: { kickoff: "asc" },
  });

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <p className="font-body text-sm text-rust">{team.town}</p>
        <h1 className="mt-1 font-display text-4xl text-stone">
          <span className="mr-2">{team.crest}</span>
          {team.name}
        </h1>

        <div className="mt-12">
          <SectionHeading title="Roster" />
          <div className="mt-6 divide-y divide-stone/10">
            {team.players.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <p className="font-body text-stone">{p.name}</p>
                <p className="font-body text-sm text-stone/50">
                  {p.position}
                  {p.number ? ` · #${p.number}` : ""}
                </p>
              </div>
            ))}
            {team.players.length === 0 && (
              <p className="py-4 font-body text-stone/50">No roster published yet.</p>
            )}
          </div>
        </div>

        <div className="mt-12">
          <SectionHeading title="Fixtures" />
          <div className="mt-6">
            {fixtures.map((f) => (
              <FixtureRow key={f.id} fixture={f} />
            ))}
          </div>
        </div>

        {team.isDemo && (
          <div className="mt-10">
            <DemoNotice>fictional demo club, for layout only.</DemoNotice>
          </div>
        )}
      </div>
    </div>
  );
}
