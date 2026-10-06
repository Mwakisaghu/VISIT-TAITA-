import Link from "next/link";
import { InviteForm } from "@/components/admin/UserForms";
import { requireManagerPage } from "@/lib/user-admin-server";
import { ROLE_HELP, rolesInvitableBy } from "@/lib/user-admin";

export const dynamic = "force-dynamic";

export default async function InviteStaffPage() {
  const actor = await requireManagerPage();
  const roles = rolesInvitableBy(actor.role).map((value) => ({ value, help: ROLE_HELP[value] ?? "" }));
  return (
    <div>
      <Link href="/admin/users" className="font-body text-sm text-stone/60 hover:text-rust">← All users</Link>
      <h1 className="mt-3 font-display text-3xl text-stone">Invite staff</h1>
      <p className="mt-2 max-w-xl font-body text-sm text-stone/60">
        Staff get their own account. We email a link so they choose their own password — please never share a login. Give people the lowest role that lets them do their job.
        {actor.role !== "SUPER_ADMIN" && " (Only a super admin can invite admins.)"}
      </p>
      <div className="mt-8"><InviteForm roles={roles} /></div>
    </div>
  );
}
