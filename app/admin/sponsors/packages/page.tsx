import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deletePackage } from "@/lib/actions/sponsors";
import { formatPrice } from "@/lib/format";

export default async function AdminSponsorPackagesPage() {
  const packages = await prisma.sponsorPackage.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { sponsors: true, leads: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-stone">Sponsorship packages</h1>
        <Link
          href="/admin/sponsors/packages/new"
          className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          New package
        </Link>
      </div>

      <div className="mt-8 divide-y divide-stone/10">
        {packages.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {p.status} · from {formatPrice(p.startingPrice)}
                {p.priceNote ? ` ${p.priceNote}` : ""} · {p._count.sponsors} sponsors · {p._count.leads} leads
              </p>
              <p className="font-display text-lg text-stone">{p.name}</p>
              {p.rights.length > 0 && (
                <p className="mt-1 font-body text-sm text-stone/60">{p.rights.join(" · ")}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/sponsors/packages/${p.id}`}
                className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
              >
                Edit
              </Link>
              <form
                action={async () => {
                  "use server";
                  await deletePackage(p.id);
                }}
              >
                <button type="submit" className="focus-ring font-body text-sm text-stone/40 hover:text-rust">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {packages.length === 0 && <p className="py-8 font-body text-stone/50">No packages yet.</p>}
      </div>
    </div>
  );
}
