import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteAccommodation } from "@/lib/actions/listings";
import { formatPrice } from "@/lib/format";

export default async function AdminAccommodationsPage() {
  const accommodations = await prisma.accommodation.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-stone">Accommodations</h1>
        <Link
          href="/admin/accommodations/new"
          className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          New accommodation
        </Link>
      </div>

      <div className="mt-8 divide-y divide-stone/10">
        {accommodations.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {a.type} · {a.region} · {a.status}
                {a.priceFrom ? ` · from ${formatPrice(a.priceFrom)}/night` : ""}
                {a.isDemo && " · demo"}
              </p>
              <p className="font-display text-lg text-stone">{a.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/accommodations/${a.id}`}
                className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
              >
                Edit
              </Link>
              <form
                action={async () => {
                  "use server";
                  await deleteAccommodation(a.id);
                }}
              >
                <button type="submit" className="focus-ring font-body text-sm text-stone/40 hover:text-rust">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {accommodations.length === 0 && <p className="py-8 font-body text-stone/50">No accommodations yet.</p>}
      </div>
    </div>
  );
}
