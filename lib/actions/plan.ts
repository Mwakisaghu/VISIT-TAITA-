"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MAX_PLANS, keyOf, orderStops, tokenFrom, validatePlanInput } from "@/lib/plan";
import { resolveStops } from "@/lib/plan-data";
import { prisma } from "@/lib/prisma";

export type SaveResult = { ok: true; token: string } | { ok: false; error: string };

/** Save a day plan for the signed-in person. Every stop is checked again against the real, published listings: nothing from the request is trusted. Saving books nothing. */
export async function savePlan(input: unknown): Promise<SaveResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Please sign in to save your plan." };
  const userId = session.user.id; const now = new Date();
  const v = validatePlanInput(input, now); if (!v.ok) return v;
  const { title, day, partySize, stops } = v.value;

  if ((await prisma.dayPlan.count({ where: { userId } })) >= MAX_PLANS) return { ok: false, error: `You have ${MAX_PLANS} saved plans, the most we keep. Delete one to save another.` };
  const found = await resolveStops(stops, day, now);
  for (const s of stops) {
    const r = found.get(keyOf(s));
    if (!r) return { ok: false, error: "One of the stops is no longer available. Please check your plan." };
    if (r.sessionProblem) return { ok: false, error: `${r.info.name}: ${r.sessionProblem}` };
  }
  // The time comes from the real session or event, not from the request.
  const rows = orderStops(stops.map((s) => ({ ...s, startMinutes: s.kind === "STAY" ? null : found.get(keyOf(s))!.startMinutes ?? s.startMinutes ?? null }))).map((s, position) => ({ position, kind: s.kind, refId: s.refId, sessionId: s.kind === "EXPERIENCE" ? s.sessionId ?? null : null, startMinutes: s.startMinutes ?? null, note: s.note ?? null }));

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const plan = await prisma.dayPlan.create({ data: { token: tokenFrom(randomBytes(8)), userId, title, day, partySize, stops: { create: rows } }, select: { token: true } });
      revalidatePath("/plan");
      return { ok: true, token: plan.token };
    } catch (e) {
      if ((e as { code?: string })?.code !== "P2002") throw e; // a token clash is astronomically rare; try a new one
    }
  }
  return { ok: false, error: "Couldn't save that. Please try again." };
}

/** Delete one of the signed-in person's own plans. */
export async function deletePlan(id: string): Promise<{ ok: boolean }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || typeof id !== "string" || id.length === 0 || id.length > 64) return { ok: false };
  await prisma.dayPlan.deleteMany({ where: { id, userId: session.user.id } });
  revalidatePath("/plan");
  return { ok: true };
}
