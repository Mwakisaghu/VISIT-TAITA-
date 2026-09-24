import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteExperience } from "@/lib/actions/listings";
import { formatPrice } from "@/lib/format";

export default async function AdminExperiencesPage() {
  const experiences = await prisma.experience.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-stone">Experiences</h1>
        <Link
          href="/admin/experiences/new"
          className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          New experience
        </Link>
      </div>

      <div className="mt-8 divide-y divide-stone/10">
        {experiences.map((x) => (
          <div key={x.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {x.category} · {x.region} · {x.status}
                {x.priceFrom ? ` · from ${formatPrice(x.priceFrom)}/person` : ""}
                {x.isDemo && " · demo"}
              </p>
              <p className="font-display text-lg text-stone">{x.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/experiences/${x.id}`}
                className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
              >
                Edit
              </Link>
              <form
                action={async () => {
                  "use server";
                  await deleteExperience(x.id);
                }}
              >
                <button type="submit" className="focus-ring font-body text-sm text-stone/40 hover:text-rust">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {experiences.length === 0 && <p className="py-8 font-body text-stone/50">No experiences yet.</p>}
      </div>
    </div>
  );
}
