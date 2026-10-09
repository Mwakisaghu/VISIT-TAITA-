import { prisma } from "@/lib/prisma";
import { buildEventIcs } from "@/lib/ics";

// `params` is read with `await` so this works on today's Next.js and on the next one (where it becomes a promise).
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> | { slug: string } }) {
  const { slug } = await ctx.params;
  const e = await prisma.event.findUnique({ where: { slug }, select: { slug: true, name: true, blurb: true, location: true, eventDate: true, status: true } });
  if (!e || e.status !== "PUBLISHED") return new Response("Not found", { status: 404 });
  const site = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  const ics = buildEventIcs({ uid: e.slug, title: e.name, start: e.eventDate, location: e.location, description: e.blurb, url: site ? `${site}/events/${e.slug}` : undefined }, new Date());
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${e.slug.replace(/[^A-Za-z0-9-]/g, "")}.ics"`, "Cache-Control": "public, max-age=300" } });
}
