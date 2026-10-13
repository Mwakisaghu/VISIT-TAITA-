import { dayBounds, isPlannableDay, minutesOf, parseDurationMinutes } from "@/lib/plan";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200, cache = "no-store") => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": cache } });

/** What can go in a plan for one day: experiences with a session that day, events that day, stays, and places. Published listings only; nothing personal. */
export async function GET(req: Request) {
  const day = new URL(req.url).searchParams.get("day"); const now = new Date();
  if (!isPlannableDay(day, now)) return json({ error: "Choose a day from today up to a year ahead." }, 400);
  const { from, to } = dayBounds(day as string); const sessionWhere = { status: "OPEN" as const, startsAt: { gt: now, gte: from, lt: to } };
  const [exps, events, stays, places] = await Promise.all([
    prisma.experience.findMany({ where: { status: "PUBLISHED", sessions: { some: sessionWhere } }, orderBy: { name: "asc" }, take: 40, select: { id: true, name: true, region: true, duration: true, priceFrom: true, latitude: true, longitude: true, altitudeM: true, sessions: { where: sessionWhere, orderBy: { startsAt: "asc" }, select: { id: true, startsAt: true, capacity: true, seatsTaken: true } } } }),
    prisma.event.findMany({ where: { status: "PUBLISHED", eventDate: { gte: from, lt: to } }, orderBy: { eventDate: "asc" }, take: 30, select: { id: true, name: true, location: true, eventDate: true, ticketing: true, ticketPrice: true } }),
    prisma.accommodation.findMany({ where: { status: "PUBLISHED" }, orderBy: { name: "asc" }, take: 40, select: { id: true, name: true, region: true, priceFrom: true, latitude: true, longitude: true, altitudeM: true } }),
    prisma.destination.findMany({ where: { status: "PUBLISHED", latitude: { not: null }, longitude: { not: null } }, orderBy: { name: "asc" }, take: 60, select: { id: true, name: true, region: true, latitude: true, longitude: true, altitudeM: true } }),
  ]);
  const body = {
    day,
    experiences: exps.map((x) => ({ id: x.id, name: x.name, region: x.region, durationMin: parseDurationMinutes(x.duration), price: x.priceFrom, latitude: x.latitude, longitude: x.longitude, altitudeM: x.altitudeM, sessions: x.sessions.filter((s) => s.capacity - s.seatsTaken > 0).map((s) => ({ id: s.id, minutes: minutesOf(s.startsAt), spots: s.capacity - s.seatsTaken })) })).filter((x) => x.sessions.length > 0),
    events: events.map((x) => ({ id: x.id, name: x.name, region: x.location, minutes: minutesOf(x.eventDate), price: x.ticketing === "PAID" ? x.ticketPrice : null, free: x.ticketing === "FREE" })),
    stays: stays.map((x) => ({ id: x.id, name: x.name, region: x.region, price: x.priceFrom, latitude: x.latitude, longitude: x.longitude, altitudeM: x.altitudeM })),
    places: places.map((x) => ({ id: x.id, name: x.name, region: x.region, latitude: x.latitude, longitude: x.longitude, altitudeM: x.altitudeM })),
  };
  return json(body, 200, "public, s-maxage=60, stale-while-revalidate=300");
}
