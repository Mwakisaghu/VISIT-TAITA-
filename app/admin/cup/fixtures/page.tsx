import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteFixture } from "@/lib/actions/cup";

export default async function AdminFixturesPage() {
  const fixtures = await prisma.sportFixture.findMany({
    include: { homeTeam: true, awayTeam: true, venue: true },
    orderBy: { kickoff: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-stone">Fixtures</h1>
        <Link
          href="/admin/cup/fixtures/new"
          className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          New fixture
        </Link>
      </div>

      <div className="mt-8 divide-y divide-stone/10">
        {fixtures.map((f) => (
          <div key={f.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {f.status} · {f.kickoff.toLocaleDateString()} · {f.venue.name}
                {f.isDemo && " · demo"}
              </p>
              <p className="font-display text-lg text-stone">
                {f.homeTeam.name}
                {f.status === "FINISHED" ? ` ${f.homeScore}–${f.awayScore} ` : " vs "}
                {f.awayTeam.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/admin/cup/fixtures/${f.id}`} className="focus-ring font-body text-sm text-stone/70 hover:text-rust">
                Edit
              </Link>
              <form action={async () => { "use server"; await deleteFixture(f.id); }}>
                <button type="submit" className="focus-ring font-body text-sm text-stone/40 hover:text-rust">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {fixtures.length === 0 && <p className="py-8 font-body text-stone/50">No fixtures yet.</p>}
      </div>
    </div>
  );
}
