import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteExperience, publishExperience } from "@/lib/actions/listings";
import { formatPrice } from "@/lib/format";

export default async function AdminExperiencesPage() {
  const experiences = await prisma.experience.findMany({
    orderBy: { updatedAt: "desc" },
    include: { owner: { select: { name: true, role: true } } },
  });

  // Partner-submitted drafts waiting on an admin — same review step as
  // Taita Made seller listings.
  const pendingReview = experiences.filter(
    (a) => a.status === "DRAFT" && a.owner?.role === "PARTNER"
  );

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

      {pendingReview.length > 0 && (
        <div className="mt-8 rounded-sm border border-ochre/40 bg-ochre/10 p-5">
          <p className="font-display text-lg text-stone">
            Pending partner review ({pendingReview.length})
          </p>
          <div className="mt-3 divide-y divide-stone/10">
            {pendingReview.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-body text-xs text-stone/50">
                    {a.owner?.name} · {a.category} · {a.region}
                  </p>
                  <p className="font-display text-base text-stone">{a.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/experiences/${a.id}`}
                    className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
                  >
                    Review
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      await publishExperience(a.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="focus-ring rounded-full bg-canopy px-4 py-1.5 font-body text-sm text-parchment hover:bg-canopy-deep"
                    >
                      Publish
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 divide-y divide-stone/10">
        {experiences.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {a.category} · {a.region} · {a.status}
                {a.priceFrom ? ` · from ${formatPrice(a.priceFrom)}/person` : ""}
                {a.isDemo && " · demo"}
              </p>
              <p className="font-display text-lg text-stone">{a.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/experiences/${a.id}`}
                className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
              >
                Edit
              </Link>
              <form
                action={async () => {
                  "use server";
                  await deleteExperience(a.id);
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
