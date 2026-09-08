import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deletePlayer } from "@/lib/actions/cup";

export default async function AdminPlayersPage() {
  const players = await prisma.sportPlayer.findMany({
    include: { team: true },
    orderBy: [{ team: { name: "asc" } }, { number: "asc" }],
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-stone">Players</h1>
        <Link
          href="/admin/cup/players/new"
          className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          New player
        </Link>
      </div>

      <div className="mt-8 divide-y divide-stone/10">
        {players.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {p.team.name} · {p.position}
                {p.isDemo && " · demo"}
              </p>
              <p className="font-display text-lg text-stone">
                {p.name}
                {p.number ? ` #${p.number}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/admin/cup/players/${p.id}`} className="focus-ring font-body text-sm text-stone/70 hover:text-rust">
                Edit
              </Link>
              <form action={async () => { "use server"; await deletePlayer(p.id); }}>
                <button type="submit" className="focus-ring font-body text-sm text-stone/40 hover:text-rust">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {players.length === 0 && <p className="py-8 font-body text-stone/50">No players yet.</p>}
      </div>
    </div>
  );
}
