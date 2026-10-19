import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { needsSecondSuperAdmin } from "@/lib/two-step/reset";

/** Shown while there are fewer than two active super admins: one lost phone, or one suspended account, would leave nobody able to manage the site. */
export default async function SingleSuperAdminWarning() {
  let count = 2;
  try { count = await prisma.user.count({ where: { role: "SUPER_ADMIN", suspendedAt: null } }); } catch { return null; } // never breaks the page
  if (!needsSecondSuperAdmin(count)) return null;
  return (
    <p role="alert" className="mt-6 max-w-2xl rounded-sm border border-rust/40 bg-rust/10 p-4 font-body text-sm text-stone">
      <strong>{count === 0 ? "There is no active super admin." : "There is only one active super admin."}</strong> If that person loses their phone, or their account is suspended, nobody can manage users or settings, and two-step sign-in
      makes that more likely to happen. <Link href="/admin/users/new" className="underline">Invite a second super admin</Link> (someone you trust, who will keep their own recovery codes).
    </p>
  );
}
