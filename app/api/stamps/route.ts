import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { beenOf, type Been } from "@/lib/stamps";

export const dynamic = "force-dynamic";

const headers = { "Content-Type": "application/json", "Cache-Control": "private, no-store" };

/** What the signed-in person has stamped: the places they have been to and the ones they want to go to. Signed out: just { signedIn: false }. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response(JSON.stringify({ signedIn: false }), { status: 200, headers });
  const userId = session.user.id;
  const [visits, wishes] = await Promise.all([
    prisma.visit.findMany({ where: { userId }, select: { destinationId: true, method: true } }),
    prisma.placeWish.findMany({ where: { userId }, select: { destinationId: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const visited: Record<string, Been> = {};
  for (const v of visits) { const b = beenOf(v.method); if (b !== "none") visited[v.destinationId] = b; }
  return new Response(JSON.stringify({ signedIn: true, visited, wanted: wishes.map((w) => w.destinationId) }), { status: 200, headers });
}
