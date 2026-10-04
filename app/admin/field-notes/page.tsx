import Link from "next/link";
import FieldNoteModeration from "@/components/admin/FieldNoteModeration";
import { formatNoteDate, methodLabel, noteStatusLabel } from "@/lib/field-notes";
import { prisma } from "@/lib/prisma";
import { safeHttpUrl } from "@/lib/url";

const TABS = [
  { key: "pending", label: "Awaiting review", status: "PENDING" },
  { key: "published", label: "Published", status: "APPROVED" },
  { key: "changes", label: "Changes requested", status: "CHANGES_REQUESTED" },
  { key: "hidden", label: "Hidden", status: "HIDDEN" },
] as const;

export default async function AdminFieldNotesPage({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = TABS.find((t) => t.key === searchParams.tab) ?? TABS[0];

  const [grouped, notes] = await Promise.all([
    prisma.fieldNote.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.fieldNote.findMany({
      where: { status: tab.status },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        creator: { select: { displayName: true, slug: true, user: { select: { email: true } } } },
        mission: { select: { title: true, rewardPoints: true, destination: { select: { name: true } } } },
      },
    }),
  ]);
  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));

  return (
    <div>
      <h1 className="font-display text-3xl text-stone">Field Notes</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/field-notes?tab=${t.key}`}
            className={`focus-ring rounded-full border px-4 py-1.5 font-body text-sm transition-colors ${
              t.key === tab.key ? "border-rust bg-rust text-parchment" : "border-stone/20 text-stone hover:border-rust hover:text-rust"
            }`}
          >
            {t.label} ({counts.get(t.status) ?? 0})
          </Link>
        ))}
      </div>

      <div className="mt-8 divide-y divide-stone/10">
        {notes.map((n) => {
          const photos = n.photos.map((p) => safeHttpUrl(p)).filter((p): p is string => !!p);
          const links = n.links.map((l) => safeHttpUrl(l)).filter((l): l is string => !!l);
          return (
            <div key={n.id} className="py-6">
              <p className="font-body text-xs text-stone/50">
                {noteStatusLabel(n.status)} · {n.mission.title} · 📍 {n.mission.destination.name}
              </p>
              <p className="mt-1 font-display text-xl text-stone">{n.title}</p>
              <p className="font-body text-xs text-stone/50">
                {n.creator.displayName} · {n.creator.user.email} · ✓ verified {formatNoteDate(n.verifiedAt)} via {methodLabel(n.verifiedMethod)}
                {n.pointsAwarded > 0 ? ` · ${n.pointsAwarded} points awarded` : ""}
              </p>

              {n.promptsSnapshot.map((p, i) => (
                <div key={`${i}-${p}`} className="mt-3">
                  <p className="font-body text-xs text-stone/50">{p}</p>
                  <p className="max-w-prose whitespace-pre-line font-body text-sm text-stone/80">{n.answers[i]}</p>
                </div>
              ))}
              {n.body && (
                <div className="mt-3">
                  <p className="font-body text-xs text-stone/50">The story</p>
                  <p className="max-w-prose whitespace-pre-line font-body text-sm text-stone/80">{n.body}</p>
                </div>
              )}

              {(photos.length > 0 || links.length > 0) && (
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                  {[...photos, ...links].map((url) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="font-body text-sm text-stone underline hover:text-rust">
                        {url} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {n.disclosureText && <p className="mt-3 font-body text-xs text-stone/60">Disclosure the creator confirmed: {n.disclosureText}</p>}
              {n.status === "CHANGES_REQUESTED" && n.reviewNote && <p className="mt-3 font-body text-xs text-stone/60">Sent to creator: {n.reviewNote}</p>}
              {n.status === "APPROVED" && (
                <Link href={`/notes/${n.slug}`} className="mt-3 inline-block font-body text-sm text-rust underline">
                  View the public note ↗
                </Link>
              )}

              <div className="mt-4">
                <FieldNoteModeration noteId={n.id} status={n.status} points={n.mission.rewardPoints} />
              </div>
            </div>
          );
        })}
        {notes.length === 0 && <p className="py-8 font-body text-stone/50">{tab.key === "pending" ? "Nothing waiting for review." : "Nothing here."}</p>}
      </div>
    </div>
  );
}
