import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200, cache = "no-store") => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": cache } });

/** The place a story is about, so "Want to go there?" can build a day around it. Published story, published place only. */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return json({ place: null }, 400);
  const s = await prisma.story.findFirst({ where: { slug, status: "PUBLISHED" }, select: { destination: { select: { id: true, name: true, status: true } } } });
  const d = s?.destination; return json({ place: d && d.status === "PUBLISHED" ? { id: d.id, name: d.name } : null }, 200, "public, s-maxage=300");
}
