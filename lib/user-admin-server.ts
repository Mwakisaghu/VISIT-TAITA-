import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManager } from "@/lib/user-admin";

// Deliberately NOT a "use server" file (server actions are public endpoints).

export type ManagerActor = { id: string; name: string; email: string; role: string };

/**
 * The signed-in administrator, read FRESH from the database — not from their login cookie, which can be minutes out of date.
 * Null unless they are an active super admin or admin. Used by every user-management action and page.
 */
export async function currentManager(): Promise<ManagerActor | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;
  const a = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, suspendedAt: true } });
  if (!a || a.suspendedAt || !isManager(a.role)) return null;
  return { id: a.id, name: a.name, email: a.email, role: a.role };
}

/** For pages: anyone who isn't a manager is sent back to the admin home (editors can use the admin area, but not manage people). */
export async function requireManagerPage(): Promise<ManagerActor> {
  const actor = await currentManager();
  if (!actor) redirect("/admin");
  return actor;
}
