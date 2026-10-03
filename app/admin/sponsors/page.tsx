import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteSponsor } from "@/lib/actions/sponsors";
import { programLabel } from "@/lib/format";

export default async function AdminSponsorsPage() {
  const sponsors = await prisma.sponsor.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: { package: { select: { name: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-stone">Sponsors</h1>
        <Link
          href="/admin/sponsors/new"
          className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          Add sponsor
        </Link>
      </div>

      <p className="mt-2 font-body text-sm text-stone/60">
        Only confirmed partners belong here. Packages are managed under{" "}
        <Link href="/admin/sponsors/packages" className="underline hover:text-rust">
          Sponsor Packages
        </Link>
        .
      </p>

      <div className="mt-8 divide-y divide-stone/10">
        {sponsors.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {s.status}
                {s.package ? ` · ${s.package.name}` : ""}
                {s.programs.length > 0 ? ` · ${s.programs.map(programLabel).join(", ")}` : ""}
                {s.showOnHome ? " · homepage" : ""}
              </p>
              <p className="font-display text-lg text-stone">{s.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/sponsors/${s.id}`}
                className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
              >
                Edit
              </Link>
              <form
                action={async () => {
                  "use server";
                  await deleteSponsor(s.id);
                }}
              >
                <button type="submit" className="focus-ring font-body text-sm text-stone/40 hover:text-rust">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {sponsors.length === 0 && (
          <p className="py-8 font-body text-stone/50">No sponsors yet — add your first confirmed partner.</p>
        )}
      </div>
    </div>
  );
}
