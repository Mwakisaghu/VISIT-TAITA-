import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManager } from "@/lib/user-admin";

// Deliberately NOT a "use server" file (server actions are public endpoints).

export type BookingUser = { id: string; name: string; email: string; role: string; emailVerifiedAt: Date | null; isAdmin: boolean };
// `isAdmin` means "can act on ANY booking, refund or experience": only admins and super admins — NOT editors or content managers, who can use
// the admin area but are not trusted with other people's money.

/** The signed-in person, read FRESH from the database (not their cookie): null if signed out, deleted or suspended. */
export async function currentBookingUser(): Promise<BookingUser | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;
  const u = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, emailVerifiedAt: true, suspendedAt: true } });
  if (!u || u.suspendedAt) return null;
  // A staff member who must set up two-step but has not yet is held at a session with NO privileges. This helper reads the real role from the database, so it has to honour that itself.
  const held = (session?.user as { twoStepSetupRequired?: boolean } | undefined)?.twoStepSetupRequired === true;
  return { id: u.id, name: u.name, email: u.email, role: held ? "VISITOR" : u.role, emailVerifiedAt: u.emailVerifiedAt, isAdmin: !held && isManager(u.role) };
}
