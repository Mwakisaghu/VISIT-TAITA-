import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteTeam } from "@/lib/actions/cup";

export default async function AdminTeamsPage() {
  const teams = await prisma.sportTeam.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-stone">Teams</h1>
        <Link
          href="/admin/cup/teams/new"
          className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          New team
        </Link>
      </div>

      <div className="mt-8 divide-y divide-stone/10">
        {teams.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {t.town}
                {t.isDemo && " · demo"}
              </p>
              <p className="font-display text-lg text-stone">
                {t.crest} {t.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/admin/cup/teams/${t.id}`} className="focus-ring font-body text-sm text-stone/70 hover:text-rust">
                Edit
              </Link>
              <form action={async () => { "use server"; await deleteTeam(t.id); }}>
                <button type="submit" className="focus-ring font-body text-sm text-stone/40 hover:text-rust">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {teams.length === 0 && <p className="py-8 font-body text-stone/50">No teams yet.</p>}
      </div>
    </div>
  );
}
