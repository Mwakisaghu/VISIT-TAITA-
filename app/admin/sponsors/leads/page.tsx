import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sponsorLeadStatusLabel } from "@/lib/sponsors";

export default async function AdminSponsorLeadsPage() {
  const leads = await prisma.sponsorLead.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { package: { select: { name: true } } },
  });

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Sponsor leads</h1>

      <div className="mt-8 divide-y divide-stone/10">
        {leads.map((l) => (
          <Link
            key={l.id}
            href={`/admin/sponsors/leads/${l.id}`}
            className="focus-ring flex items-center justify-between gap-4 py-4"
          >
            <div>
              <p className="font-body text-xs text-stone/50">
                {l.package?.name ?? "No package chosen"} · {l.contactName} · {l.email}
                {l.budgetRange ? ` · ${l.budgetRange}` : ""}
              </p>
              <p className="font-display text-lg text-stone">{l.companyName}</p>
              <p className="font-body text-xs text-stone/40">{l.createdAt.toLocaleDateString()}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 font-body text-xs ${
                l.status === "WON"
                  ? "bg-canopy/10 text-canopy"
                  : l.status === "LOST"
                    ? "bg-rust/10 text-rust"
                    : l.status === "NEW"
                      ? "bg-ochre/20 text-stone"
                      : "bg-stone/10 text-stone/70"
              }`}
            >
              {sponsorLeadStatusLabel(l.status)}
            </span>
          </Link>
        ))}
        {leads.length === 0 && <p className="py-8 font-body text-stone/50">No leads yet.</p>}
        {leads.length === 200 && (
          <p className="py-4 font-body text-xs text-stone/40">Showing the latest 200 leads.</p>
        )}
      </div>
    </div>
  );
}
