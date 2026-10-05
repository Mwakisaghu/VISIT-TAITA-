import { comparisonWindow } from "@/lib/impact";
import { prisma } from "@/lib/prisma";

export type MissionImpact = {
  missionId: string;
  claims: number;
  notes: number; // published
  views: number; // the mission page + its published notes
  enquiries: number; // began on a link from the mission page or one of its notes
  confirmed: number; // of those, marked CONFIRMED by the host or our team
  pointsAwarded: number;
  firstPublishedAt: Date | null;
  visitorsBefore: number | null;
  visitorsAfter: number | null;
  windowDays: number | null;
};

/** Total counted views per item, in ONE grouped query. */
export async function getViewTotals(kind: "NOTE" | "MISSION", ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (ids.length === 0) return out;
  const rows = await prisma.contentView.groupBy({
    by: ["targetId"],
    where: { kind, targetId: { in: ids } },
    _sum: { count: true },
  });
  for (const r of rows) out.set(r.targetId, r._sum.count ?? 0);
  return out;
}

/**
 * What each mission has produced. Every metric is one batched query across all the missions asked about
 * (not one per mission), so the admin page stays fast as missions grow. Only the before/after visitor
 * counts need a query per mission, and only for missions that have a published note.
 */
export async function getMissionImpacts(missionIds: string[], now: Date = new Date()): Promise<Map<string, MissionImpact>> {
  const out = new Map<string, MissionImpact>();
  if (missionIds.length === 0) return out;

  const [missions, claimGroups, notes, missionViews, stayEnquiries, experienceEnquiries] = await Promise.all([
    prisma.mission.findMany({ where: { id: { in: missionIds } }, select: { id: true, destinationId: true } }),
    prisma.missionClaim.groupBy({
      by: ["missionId"],
      where: { missionId: { in: missionIds }, status: { not: "WITHDRAWN" } },
      _count: { _all: true },
    }),
    prisma.fieldNote.findMany({
      where: { missionId: { in: missionIds }, status: { in: ["APPROVED", "HIDDEN"] } },
      select: { id: true, missionId: true, status: true, publishedAt: true, pointsAwarded: true },
    }),
    getViewTotals("MISSION", missionIds),
    prisma.accommodationEnquiry.groupBy({
      by: ["referredByMissionId", "status"],
      where: { referredByMissionId: { in: missionIds } },
      _count: { _all: true },
    }),
    prisma.experienceEnquiry.groupBy({
      by: ["referredByMissionId", "status"],
      where: { referredByMissionId: { in: missionIds } },
      _count: { _all: true },
    }),
  ]);

  const publishedIds = notes.filter((n) => n.status === "APPROVED").map((n) => n.id);
  const noteViews = await getViewTotals("NOTE", publishedIds);
  const claimsBy = new Map(claimGroups.map((g) => [g.missionId, g._count._all]));

  // Enquiries that began on the mission page or one of its notes (the listing was the one the mission features).
  const enquiriesBy = new Map<string, { total: number; confirmed: number }>();
  for (const g of [...stayEnquiries, ...experienceEnquiries]) {
    if (!g.referredByMissionId) continue;
    const t = enquiriesBy.get(g.referredByMissionId) ?? { total: 0, confirmed: 0 };
    t.total += g._count._all;
    if (g.status === "CONFIRMED") t.confirmed += g._count._all;
    enquiriesBy.set(g.referredByMissionId, t);
  }

  await Promise.all(
    missions.map(async (m) => {
      const mine = notes.filter((n) => n.missionId === m.id);
      const published = mine.filter((n) => n.status === "APPROVED");
      const stamps = mine.map((n) => n.publishedAt).filter((d): d is Date => d instanceof Date);
      const firstPublishedAt = stamps.length > 0 ? new Date(Math.min(...stamps.map((d) => d.getTime()))) : null;

      let visitorsBefore: number | null = null;
      let visitorsAfter: number | null = null;
      let windowDays: number | null = null;
      if (firstPublishedAt) {
        const w = comparisonWindow(firstPublishedAt, now);
        windowDays = w.days;
        // One CHECKIN ledger entry exists per person per place, ever — so this counts FIRST-TIME verified visitors.
        [visitorsBefore, visitorsAfter] = await Promise.all([
          prisma.pointsEntry.count({ where: { reason: "CHECKIN", destinationId: m.destinationId, createdAt: { gte: w.before.start, lt: w.before.end } } }),
          prisma.pointsEntry.count({ where: { reason: "CHECKIN", destinationId: m.destinationId, createdAt: { gte: w.after.start, lte: w.after.end } } }),
        ]);
      }

      out.set(m.id, {
        missionId: m.id,
        claims: claimsBy.get(m.id) ?? 0,
        enquiries: enquiriesBy.get(m.id)?.total ?? 0,
        confirmed: enquiriesBy.get(m.id)?.confirmed ?? 0,
        notes: published.length,
        views: (missionViews.get(m.id) ?? 0) + published.reduce((sum, n) => sum + (noteViews.get(n.id) ?? 0), 0),
        pointsAwarded: mine.reduce((sum, n) => sum + n.pointsAwarded, 0),
        firstPublishedAt,
        visitorsBefore,
        visitorsAfter,
        windowDays,
      });
    })
  );
  return out;
}

export type SponsorReportData = {
  sponsor: { id: string; name: string; logo: string; website: string | null };
  generatedAt: Date;
  totals: { missions: number; creators: number; notes: number; views: number; pointsAwarded: number; enquiries: number; confirmed: number };
  missions: {
    id: string;
    slug: string;
    title: string;
    status: string;
    campaign: string | null;
    place: string;
    support: string;
    supportNote: string | null;
    impact: MissionImpact;
    notes: { id: string; slug: string; title: string; creatorName: string; publishedAt: Date | null; views: number }[];
  }[];
};

/** Everything a sponsor is shown about the missions they funded. Totals only — no private details. */
export async function getSponsorReport(sponsorId: string, now: Date = new Date()): Promise<SponsorReportData | null> {
  const sponsor = await prisma.sponsor.findUnique({ where: { id: sponsorId }, select: { id: true, name: true, logo: true, website: true } });
  if (!sponsor) return null;

  // A sponsor's report only ever covers missions that were actually run.
  const missions = await prisma.mission.findMany({
    where: { sponsorId: sponsor.id, support: "SPONSORED", status: { in: ["OPEN", "CLOSED"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, title: true, status: true, campaign: true, support: true, supportNote: true, destination: { select: { name: true } } },
  });
  const ids = missions.map((m) => m.id);

  const [impacts, notes, claimers] = await Promise.all([
    getMissionImpacts(ids, now),
    ids.length === 0
      ? Promise.resolve([])
      : prisma.fieldNote.findMany({
          where: { missionId: { in: ids }, status: "APPROVED", creator: { status: "ACTIVE" } },
          orderBy: { publishedAt: "desc" },
          select: { id: true, slug: true, title: true, missionId: true, publishedAt: true, creator: { select: { displayName: true } } },
        }),
    ids.length === 0
      ? Promise.resolve([])
      : prisma.missionClaim.findMany({ where: { missionId: { in: ids }, status: { not: "WITHDRAWN" } }, select: { creatorId: true } }),
  ]);
  const noteViews = await getViewTotals("NOTE", notes.map((n) => n.id));

  const rows = missions.map((m) => ({
    id: m.id,
    slug: m.slug,
    title: m.title,
    status: m.status,
    campaign: m.campaign,
    place: m.destination.name,
    support: m.support,
    supportNote: m.supportNote,
    impact: impacts.get(m.id)!,
    notes: notes
      .filter((n) => n.missionId === m.id)
      .map((n) => ({ id: n.id, slug: n.slug, title: n.title, creatorName: n.creator.displayName, publishedAt: n.publishedAt, views: noteViews.get(n.id) ?? 0 })),
  }));

  return {
    sponsor,
    generatedAt: now,
    totals: {
      missions: rows.length,
      creators: new Set(claimers.map((c) => c.creatorId)).size,
      notes: rows.reduce((s, r) => s + r.impact.notes, 0),
      views: rows.reduce((s, r) => s + r.impact.views, 0),
      pointsAwarded: rows.reduce((s, r) => s + r.impact.pointsAwarded, 0),
      enquiries: rows.reduce((s, r) => s + r.impact.enquiries, 0),
      confirmed: rows.reduce((s, r) => s + r.impact.confirmed, 0),
    },
    missions: rows,
  };
}

export type ProgrammeTotals = { creators: number; openMissions: number; claims: number; notes: number; views: number; pointsAwarded: number };

export async function getProgrammeTotals(): Promise<ProgrammeTotals> {
  const [creators, openMissions, claims, notes, points, views] = await Promise.all([
    prisma.creator.count({ where: { status: "ACTIVE" } }),
    prisma.mission.count({ where: { status: "OPEN" } }),
    prisma.missionClaim.count({ where: { status: { not: "WITHDRAWN" } } }),
    prisma.fieldNote.count({ where: { status: "APPROVED" } }),
    prisma.fieldNote.aggregate({ where: { status: { in: ["APPROVED", "HIDDEN"] } }, _sum: { pointsAwarded: true } }),
    prisma.contentView.aggregate({ _sum: { count: true } }),
  ]);
  return { creators, openMissions, claims, notes, views: views._sum.count ?? 0, pointsAwarded: points._sum.pointsAwarded ?? 0 };
}
