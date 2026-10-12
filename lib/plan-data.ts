import { prisma } from "@/lib/prisma";
import { dayBounds, minutesOf, parseDurationMinutes, keyOf, type Stop, type StopInfo, type StopKind } from "@/lib/plan";

export type Resolved = {
  info: StopInfo; kind: StopKind; refId: string; href: string; region: string; image: string | null; startMinutes: number | null;
  sessionProblem: string | null; // set when the chosen session can't be used (not that day, full, closed, already started)
  bookable: boolean;
};

/** Looks up every stop in the real (published) listings. A stop that is not found is simply absent from the answer. */
export async function resolveStops(stops: Stop[], day: string, now: Date): Promise<Map<string, Resolved>> {
  const out = new Map<string, Resolved>(); const { from, to } = dayBounds(day);
  const ids = (k: StopKind) => [...new Set(stops.filter((s) => s.kind === k).map((s) => s.refId))];
  const [exps, events, stays, places, sessions] = await Promise.all([
    ids("EXPERIENCE").length ? prisma.experience.findMany({ where: { id: { in: ids("EXPERIENCE") }, status: "PUBLISHED" }, select: { id: true, slug: true, name: true, region: true, image: true, duration: true, priceFrom: true, latitude: true, longitude: true, bookingEnabled: true } }) : [],
    ids("EVENT").length ? prisma.event.findMany({ where: { id: { in: ids("EVENT") }, status: "PUBLISHED" }, select: { id: true, slug: true, name: true, location: true, eventDate: true, ticketing: true, ticketPrice: true } }) : [],
    ids("STAY").length ? prisma.accommodation.findMany({ where: { id: { in: ids("STAY") }, status: "PUBLISHED" }, select: { id: true, slug: true, name: true, region: true, image: true, priceFrom: true, latitude: true, longitude: true } }) : [],
    ids("PLACE").length ? prisma.destination.findMany({ where: { id: { in: ids("PLACE") }, status: "PUBLISHED" }, select: { id: true, slug: true, name: true, region: true, image: true, latitude: true, longitude: true, category: true } }) : [],
    stops.some((s) => s.sessionId) ? prisma.experienceSession.findMany({ where: { id: { in: [...new Set(stops.map((s) => s.sessionId).filter((x): x is string => !!x))] } }, select: { id: true, experienceId: true, startsAt: true, capacity: true, seatsTaken: true, status: true } }) : [],
  ]);
  const sess = new Map(sessions.map((x) => [x.id, x]));
  for (const x of exps) {
    const st = stops.find((s) => s.kind === "EXPERIENCE" && s.refId === x.id)!; const se = st.sessionId ? sess.get(st.sessionId) : null; let problem: string | null = null; let start = st.startMinutes ?? null;
    if (st.sessionId) {
      if (!se || se.experienceId !== x.id) problem = "That session isn't available.";
      else if (se.status !== "OPEN") problem = "That session is closed.";
      else if (se.startsAt.getTime() <= now.getTime()) problem = "That session has already started.";
      else if (se.startsAt < from || se.startsAt >= to) problem = "That session is on a different day.";
      else if (se.capacity - se.seatsTaken <= 0) problem = "That session is full.";
      else start = minutesOf(se.startsAt);
    }
    out.set(keyOf({ kind: "EXPERIENCE", refId: x.id }), { kind: "EXPERIENCE", refId: x.id, info: { name: x.name, durationMin: parseDurationMinutes(x.duration), latitude: x.latitude, longitude: x.longitude, price: x.priceFrom }, href: `/experiences/listing/${x.slug}`, region: x.region, image: x.image, startMinutes: start, sessionProblem: problem, bookable: x.bookingEnabled });
  }
  for (const x of events) {
    const onDay = x.eventDate >= from && x.eventDate < to;
    out.set(keyOf({ kind: "EVENT", refId: x.id }), { kind: "EVENT", refId: x.id, info: { name: x.name, price: x.ticketing === "PAID" ? x.ticketPrice : null, free: x.ticketing === "FREE" }, href: `/events/${x.slug}`, region: x.location, image: null, startMinutes: minutesOf(x.eventDate), sessionProblem: onDay ? null : "That event is on a different day.", bookable: x.ticketing !== "OFF" });
  }
  for (const x of stays) out.set(keyOf({ kind: "STAY", refId: x.id }), { kind: "STAY", refId: x.id, info: { name: x.name, price: x.priceFrom, latitude: x.latitude, longitude: x.longitude }, href: `/stay/listing/${x.slug}`, region: x.region, image: x.image, startMinutes: null, sessionProblem: null, bookable: false });
  for (const x of places) out.set(keyOf({ kind: "PLACE", refId: x.id }), { kind: "PLACE", refId: x.id, info: { name: x.name, latitude: x.latitude, longitude: x.longitude }, href: `/map?place=${x.slug}`, region: x.region, image: x.image, startMinutes: null, sessionProblem: null, bookable: false });
  return out;
}
