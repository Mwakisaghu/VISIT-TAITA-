import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { specialtyLabel, trackLabel } from "@/lib/creators";
import { safeHttpUrl } from "@/lib/url";
import CreatorApplicationActions from "@/components/admin/CreatorApplicationActions";
import CreatorStatusToggle from "@/components/admin/CreatorStatusToggle";

const TABS = [
  { key: "pending", label: "Pending", status: "PENDING" },
  { key: "approved", label: "Approved", status: "APPROVED" },
  { key: "rejected", label: "Rejected", status: "REJECTED" },
] as const;

export default async function AdminCreatorsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = searchParams.tab === "crew" ? "crew" : TABS.find((t) => t.key === searchParams.tab)?.key ?? "pending";

  const [grouped, crewCount] = await Promise.all([
    prisma.creatorApplication.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.creator.count(),
  ]);
  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));

  const applications =
    tab === "crew"
      ? []
      : await prisma.creatorApplication.findMany({
          where: { status: TABS.find((t) => t.key === tab)!.status },
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { user: { select: { name: true, email: true, role: true } } },
        });

  const crew =
    tab === "crew"
      ? await prisma.creator.findMany({
          orderBy: { createdAt: "desc" },
          take: 200,
          include: { user: { select: { email: true } } },
        })
      : [];

  const tabClass = (active: boolean) =>
    `focus-ring rounded-full border px-4 py-1.5 font-body text-sm transition-colors ${
      active ? "border-rust bg-rust text-parchment" : "border-stone/20 text-stone hover:border-rust hover:text-rust"
    }`;

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Field Crew</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/creators?tab=${t.key}`} className={tabClass(tab === t.key)}>
            {t.label} ({counts.get(t.status) ?? 0})
          </Link>
        ))}
        <Link href="/admin/creators?tab=crew" className={tabClass(tab === "crew")}>
          Crew ({crewCount})
        </Link>
      </div>

      {tab === "crew" ? (
        <div className="mt-8 divide-y divide-stone/10">
          {crew.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="font-body text-xs text-stone/50">
                  {trackLabel(c.track)} · {c.status} · {c.user.email}
                </p>
                <Link href={`/creators/${c.slug}`} className="font-display text-lg text-stone hover:text-rust">
                  {c.displayName} ↗
                </Link>
              </div>
              <CreatorStatusToggle creatorId={c.id} status={c.status} />
            </div>
          ))}
          {crew.length === 0 && <p className="py-8 font-body text-stone/50">No creators yet.</p>}
        </div>
      ) : (
        <div className="mt-8 divide-y divide-stone/10">
          {applications.map((a) => {
            const links = a.portfolioLinks.map((l) => safeHttpUrl(l)).filter((l): l is string => !!l);
            return (
              <div key={a.id} className="py-6">
                <p className="font-body text-xs text-stone/50">
                  {trackLabel(a.track)}
                  {a.location ? ` · ${a.location}` : ""} · {a.specialties.map(specialtyLabel).join(", ")}
                </p>
                <p className="mt-1 font-display text-xl text-stone">{a.displayName}</p>
                <p className="font-body text-xs text-stone/50">
                  {a.user.name} · {a.user.email} · account role {a.user.role} · applied {a.createdAt.toLocaleDateString()} ·
                  guidelines {a.termsVersion}
                </p>

                <p className="mt-3 max-w-prose whitespace-pre-line font-body text-sm text-stone/80">{a.bio}</p>
                <p className="mt-3 font-body text-xs text-stone/50">Pitch</p>
                <p className="max-w-prose whitespace-pre-line font-body text-sm text-stone/80">{a.pitch}</p>

                {links.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                    {links.map((url) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="font-body text-sm text-stone underline hover:text-rust">
                          {url} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {a.followerNote && (
                  <p className="mt-3 font-body text-xs text-stone/60">
                    Audience note (self-reported, admin-only): {a.followerNote}
                  </p>
                )}
                {a.status === "REJECTED" && a.rejectionReason && (
                  <p className="mt-3 font-body text-xs text-stone/60">Sent to applicant: {a.rejectionReason}</p>
                )}

                {a.status === "PENDING" && (
                  <div className="mt-4">
                    <CreatorApplicationActions applicationId={a.id} />
                  </div>
                )}
              </div>
            );
          })}
          {applications.length === 0 && (
            <p className="py-8 font-body text-stone/50">
              {tab === "pending" ? "No applications waiting." : `No ${tab} applications.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
