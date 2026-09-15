import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteFestivalVenue } from "@/lib/actions/festival";

export default async function AdminFestivalVenuesPage() {
  const venues = await prisma.festivalVenue.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-stone">Taita Week — Venues</h1>
        <Link
          href="/admin/week/venues/new"
          className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          New venue
        </Link>
      </div>

      <div className="mt-8 divide-y divide-stone/10">
        {venues.map((v) => (
          <div key={v.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {v.location}
                {v.isDemo && " · demo"}
              </p>
              <p className="font-display text-lg text-stone">{v.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/week/venues/${v.id}`}
                className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
              >
                Edit
              </Link>
              <form
                action={async () => {
                  "use server";
                  await deleteFestivalVenue(v.id);
                }}
              >
                <button type="submit" className="focus-ring font-body text-sm text-stone/40 hover:text-rust">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {venues.length === 0 && <p className="py-8 font-body text-stone/50">No venues yet.</p>}
      </div>
    </div>
  );
}
