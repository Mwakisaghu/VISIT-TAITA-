import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteFestivalSession } from "@/lib/actions/festival";
import { sessionCategoryLabel, formatSessionDay, formatSessionTime } from "@/lib/format";

export default async function AdminFestivalSessionsPage() {
  const sessions = await prisma.festivalSession.findMany({
    orderBy: { startsAt: "asc" },
    include: { venue: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-stone">Taita Week — Programme</h1>
        <Link
          href="/admin/week/sessions/new"
          className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          New session
        </Link>
      </div>

      <div className="mt-8 divide-y divide-stone/10">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {sessionCategoryLabel(s.category)} · {formatSessionDay(s.startsAt)} ·{" "}
                {formatSessionTime(s.startsAt)} · {s.venue.name} · {s.status}
                {s.isDemo && " · demo"}
              </p>
              <p className="font-display text-lg text-stone">{s.title}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/week/sessions/${s.id}`}
                className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
              >
                Edit
              </Link>
              <form
                action={async () => {
                  "use server";
                  await deleteFestivalSession(s.id);
                }}
              >
                <button type="submit" className="focus-ring font-body text-sm text-stone/40 hover:text-rust">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {sessions.length === 0 && <p className="py-8 font-body text-stone/50">No sessions yet.</p>}
      </div>
    </div>
  );
}
