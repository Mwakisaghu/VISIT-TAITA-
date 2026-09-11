import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { partnerTypeLabel, applicationStatusLabel } from "@/lib/format";

export default async function AdminPartnersPage() {
  const applications = await prisma.partnerApplication.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Partner applications</h1>

      <div className="mt-8 divide-y divide-stone/10">
        {applications.map((app) => (
          <Link
            key={app.id}
            href={`/admin/partners/${app.id}`}
            className="focus-ring flex items-center justify-between gap-4 py-4"
          >
            <div>
              <p className="font-body text-xs text-stone/50">
                {partnerTypeLabel(app.partnerType)} · {app.email}
              </p>
              <p className="font-display text-lg text-stone">{app.businessName}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 font-body text-xs ${
                app.status === "APPROVED"
                  ? "bg-canopy/10 text-canopy"
                  : app.status === "REJECTED"
                    ? "bg-rust/10 text-rust"
                    : "bg-stone/10 text-stone/70"
              }`}
            >
              {applicationStatusLabel(app.status)}
            </span>
          </Link>
        ))}
        {applications.length === 0 && (
          <p className="py-8 font-body text-stone/50">No applications yet.</p>
        )}
      </div>
    </div>
  );
}
