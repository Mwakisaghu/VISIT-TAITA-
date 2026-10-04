"use server";

import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { ADMIN_ROLES, authOptions } from "@/lib/auth";
import { VIEWS_PER_ITEM_PER_DAY, isBotUserAgent, startOfUtcDay } from "@/lib/impact";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const DAY_MS = 24 * 60 * 60 * 1000;

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/**
 * Counts one view of a published Field Note or a mission page. Called from the browser, once per browser
 * session per page (the pages are cached, so a server-side counter would miss most visits). It never
 * throws and never reveals anything: a visitor's page must not be affected by the counter.
 *
 * Not counted: obvious bots and link-preview fetchers, staff (so editors previewing don't inflate it),
 * repeat loads beyond a few per visitor per day, and anything that isn't a public item — so a draft or
 * unknown id can't be used to pad numbers. Only a per-day count is stored, with no visitor identity.
 */
export async function recordView(kind: string, targetId: string): Promise<void> {
  try {
    if (kind !== "NOTE" && kind !== "MISSION") return;
    const id = String(targetId ?? "");
    if (!id || id.length > 40) return;

    const h = headers();
    if (isBotUserAgent(h.get("user-agent"))) return;

    const session = await getServerSession(authOptions);
    if (session?.user && ADMIN_ROLES.includes(session.user.role)) return;

    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
    // Behind a proxy that hides the address, everyone shares one key — allow a generous cap instead of a tiny one.
    const limit = ip === "unknown" ? 200 : VIEWS_PER_ITEM_PER_DAY;
    if (!rateLimit(`view:${ip}:${kind}:${id}`, limit, DAY_MS)) return;

    const isPublic =
      kind === "NOTE"
        ? await prisma.fieldNote.findFirst({ where: { id, status: "APPROVED" }, select: { id: true } })
        : await prisma.mission.findFirst({ where: { id, status: { in: ["OPEN", "CLOSED"] } }, select: { id: true } });
    if (!isPublic) return;

    const key = { kind, targetId: id, day: startOfUtcDay(new Date()) } as const;
    try {
      await prisma.contentView.upsert({
        where: { kind_targetId_day: key },
        create: { id: randomUUID(), ...key, count: 1 },
        update: { count: { increment: 1 } },
      });
    } catch (err) {
      // Two first-views of the day racing to create the row: the loser just increments it.
      if (!isUniqueViolation(err)) throw err;
      await prisma.contentView.update({ where: { kind_targetId_day: key }, data: { count: { increment: 1 } } });
    }
  } catch (err) {
    console.error("[views] could not record a view", err);
  }
}
