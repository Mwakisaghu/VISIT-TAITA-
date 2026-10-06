import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// prisma/seed.ts creates this account with a password that is written in the public source code. If the seed was ever run on a
// live database, anyone who has read the code could sign in as a super admin. This is how the admin area notices.
export const DEMO_ADMIN_EMAIL = "admin@visittaita.example";
export const DEMO_ADMIN_PASSWORD = "ChangeMe123!";

let cache: { at: number; value: boolean } | null = null;
const TTL_MS = 5 * 60 * 1000;

/** True if the demo admin exists, isn't suspended, and still has the published password. (Cached for a few minutes: bcrypt is slow.) */
export async function demoAdminIsInsecure(db: Pick<typeof prisma, "user"> = prisma, now = Date.now()): Promise<boolean> {
  if (cache && now - cache.at < TTL_MS) return cache.value;
  let value = false;
  try {
    const u = await db.user.findUnique({ where: { email: DEMO_ADMIN_EMAIL }, select: { passwordHash: true, suspendedAt: true } });
    value = !!u && !u.suspendedAt && (await bcrypt.compare(DEMO_ADMIN_PASSWORD, u.passwordHash));
  } catch {
    value = false;
  }
  cache = { at: now, value };
  return value;
}

export const resetDemoAdminCache = () => { cache = null; };
