// Everything the Passport page shows, read for ONE person. Every query that touches a person's own data is scoped to them.
import { prisma } from "@/lib/prisma";
import { stateOf, type Endorsement, type PassportData, type PassportPlace, type VisitMethod } from "@/lib/passport-book";

// The standard endorsements come first, in this order; any the team adds later follow, by name.
const STANDARD = ["TAITA_EXPLORER", "TAITA_WILD", "TAITA_CULTURE", "TAITA_TRAILS", "TAITA_TASTE", "TAITA_SPORT", "TAITA_INSIDER", "TAITA_LEGEND"];
const INSIDER_NEED = 3; // visits in three different kinds of place (the same rule the check-in code uses to award it)

export async function loadPassport(userId: string): Promise<PassportData | null> {
  const [user, destinations, visits, badges, earned, wishRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, points: true, createdAt: true } }),
    prisma.destination.findMany({ where: { status: "PUBLISHED" }, select: { id: true, slug: true, name: true, region: true, category: true, altitudeM: true, latitude: true, longitude: true, checkinRadiusM: true }, orderBy: { name: "asc" } }),
    prisma.visit.findMany({ where: { userId }, select: { destinationId: true, method: true, visitedAt: true } }),
    prisma.badge.findMany({ select: { id: true, key: true, label: true, description: true } }),
    prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true, earnedAt: true } }),
    prisma.placeWish.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { destinationId: true } }),
  ]);
  if (!user) return null;

  const visitBy = new Map(visits.map((v) => [v.destinationId, v]));
  const wished = new Set(wishRows.map((w) => w.destinationId));
  const places: PassportPlace[] = destinations.map((d) => {
    const v = visitBy.get(d.id); const state = stateOf(v?.method);
    return {
      id: d.id, slug: d.slug, name: d.name, region: d.region, category: d.category, altitudeM: d.altitudeM ?? null,
      state, method: state === "open" ? null : (v!.method as VisitMethod), visitedAt: state === "open" ? null : v!.visitedAt.toISOString(),
      canLocate: d.latitude !== null && d.longitude !== null, radiusM: d.checkinRadiusM, wanted: wished.has(d.id) && state === "open",
    };
  });

  // progress is real or absent: only the two endorsements that are counted (Insider, Legend) show it; the rest are earned by one visit to a place of that kind
  const published = new Map(destinations.map((d) => [d.id, d]));
  const visited = visits.filter((v) => published.has(v.destinationId));
  const kinds = new Set(visited.map((v) => published.get(v.destinationId)!.category));
  const earnedAt = new Map(earned.map((e) => [e.badgeId, e.earnedAt]));
  const endorsements: Endorsement[] = badges.map((b) => {
    const at = earnedAt.get(b.id) ?? null; const isEarned = at !== null;
    let progress: Endorsement["progress"] = null;
    if (!isEarned && b.key === "TAITA_INSIDER") progress = { have: Math.min(kinds.size, INSIDER_NEED), need: INSIDER_NEED };
    if (!isEarned && b.key === "TAITA_LEGEND" && destinations.length > 0) progress = { have: Math.min(visited.length, destinations.length), need: destinations.length };
    return { key: b.key, label: b.label, description: b.description, earned: isEarned, earnedAt: at ? at.toISOString() : null, progress };
  }).sort((a, b) => { const ia = STANDARD.indexOf(a.key), ib = STANDARD.indexOf(b.key); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.label.localeCompare(b.label); });

  const wishes = wishRows.flatMap((w) => { const d = published.get(w.destinationId); return d ? [{ id: d.id, name: d.name, slug: d.slug, region: d.region, altitudeM: d.altitudeM ?? null }] : []; });
  return { holder: { name: user.name, issuedAt: user.createdAt.toISOString() }, points: user.points, places, endorsements, wishes };
}
