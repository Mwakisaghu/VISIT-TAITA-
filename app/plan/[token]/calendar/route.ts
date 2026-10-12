import { buildPlanIcs, type IcsStop } from "@/lib/plan-ics";
import { dayStart, isToken, keyOf, orderStops, type Stop } from "@/lib/plan";
import { resolveStops } from "@/lib/plan-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** The plan as a calendar file: one event for each stop that has a time and is still available. */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> | { token: string } }) {
  const { token } = await ctx.params;
  if (!isToken(token)) return new Response("Not found", { status: 404 });
  const plan = await prisma.dayPlan.findUnique({ where: { token }, select: { token: true, title: true, day: true, stops: { orderBy: { position: "asc" }, select: { kind: true, refId: true, sessionId: true, startMinutes: true, note: true } } } });
  if (!plan) return new Response("Not found", { status: 404 });
  const now = new Date(); const stops: Stop[] = plan.stops.map((s) => ({ kind: s.kind, refId: s.refId, sessionId: s.sessionId, startMinutes: s.startMinutes, note: s.note }));
  const found = await resolveStops(stops, plan.day, now); const origin = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  const events: IcsStop[] = orderStops(stops).flatMap((s) => {
    const r = found.get(keyOf(s)); if (!r || s.kind === "STAY" || typeof s.startMinutes !== "number") return [];
    return [{ start: new Date(dayStart(plan.day).getTime() + s.startMinutes * 60_000), durationMin: r.info.durationMin ?? 60, name: r.info.name, location: r.region, url: /^https?:\/\/[^/\s]+$/.test(origin) ? origin + r.href : undefined }];
  });
  if (events.length === 0) return new Response("Not found", { status: 404 });
  return new Response(buildPlanIcs({ token: plan.token, title: plan.title, stops: events }, now), { status: 200, headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="taita-day-${plan.day}.ics"`, "Cache-Control": "no-store" } });
}
