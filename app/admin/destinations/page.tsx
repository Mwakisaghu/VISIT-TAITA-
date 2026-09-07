import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteDestination } from "@/lib/actions/admin";

export default async function AdminDestinationsPage() {
  const destinations = await prisma.destination.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-stone">Destinations</h1>
        <Link
          href="/admin/destinations/new"
          className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          New destination
        </Link>
      </div>

      <div className="mt-8 divide-y divide-stone/10">
        {destinations.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {d.category} · {d.status}
                {d.isDemo && " · demo"}
              </p>
              <p className="font-display text-lg text-stone">{d.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/destinations/${d.id}`}
                className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
              >
                Edit
              </Link>
              <form
                action={async () => {
                  "use server";
                  await deleteDestination(d.id);
                }}
              >
                <button type="submit" className="focus-ring font-body text-sm text-stone/40 hover:text-rust">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {destinations.length === 0 && (
          <p className="py-8 font-body text-stone/50">No destinations yet.</p>
        )}
      </div>
    </div>
  );
}
