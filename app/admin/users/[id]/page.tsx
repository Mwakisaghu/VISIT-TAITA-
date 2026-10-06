import Link from "next/link";
import { notFound } from "next/navigation";
import { RoleForm, SuspendForm, UserActions } from "@/components/admin/UserForms";
import { prisma } from "@/lib/prisma";
import { requireManagerPage } from "@/lib/user-admin-server";
import { AUDIT_LABELS, accountStatus, checkActOn, isPendingInvite, roleLabel, rolesAssignableBy, ROLES_MANAGED_ELSEWHERE } from "@/lib/user-admin";

export const dynamic = "force-dynamic";

export default async function UserPage({ params }: { params: { id: string } }) {
  const actor = await requireManagerPage();
  const u = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, name: true, email: true, role: true, points: true, createdAt: true, emailVerifiedAt: true, passwordChangedAt: true, invitedAt: true, suspendedAt: true, suspendedReason: true } });
  if (!u) notFound();

  const [orders, reviews, stays, experiences, products, rewards, log] = await Promise.all([
    prisma.order.count({ where: { buyerId: u.id } }), prisma.review.count({ where: { userId: u.id } }),
    prisma.accommodation.count({ where: { ownerId: u.id } }), prisma.experience.count({ where: { ownerId: u.id } }),
    prisma.product.count({ where: { sellerId: u.id } }), prisma.reward.count({ where: { ownerId: u.id } }),
    prisma.adminAuditLog.findMany({ where: { targetUserId: u.id }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, action: true, actorEmail: true, detail: true, createdAt: true } }),
  ]);

  const status = accountStatus(u);
  const blocked = checkActOn(actor, u); // why this person can't be changed by THIS admin, if so
  const managedElsewhere = (ROLES_MANAGED_ELSEWHERE as readonly string[]).includes(u.role);
  const assignable = rolesAssignableBy(actor.role);
  const owns = stays + experiences + products + rewards;

  return (
    <div>
      <Link href="/admin/users" className="font-body text-sm text-stone/60 hover:text-rust">← All users</Link>
      <h1 className="mt-3 font-display text-3xl text-stone">{u.name}</h1>
      <p className="mt-1 font-body text-sm text-stone/60">{u.email} · {roleLabel(u.role)} · <span className={status === "Suspended" ? "text-rust" : ""}>{status}</span></p>

      {u.suspendedAt && (
        <p className="mt-4 max-w-xl rounded-sm border border-rust/40 bg-rust/10 p-4 font-body text-sm text-stone">
          <strong>Suspended</strong> on {u.suspendedAt.toISOString().slice(0, 10)}{u.suspendedReason ? `: ${u.suspendedReason}` : ""}. They can&apos;t sign in.
        </p>
      )}

      <dl className="mt-6 grid max-w-xl grid-cols-2 gap-x-6 gap-y-2 font-body text-sm">
        <dt className="text-stone/50">Joined</dt><dd>{u.createdAt.toISOString().slice(0, 10)}</dd>
        <dt className="text-stone/50">Email verified</dt><dd>{u.emailVerifiedAt ? u.emailVerifiedAt.toISOString().slice(0, 10) : "Not yet"}</dd>
        <dt className="text-stone/50">Points</dt><dd>{u.points}</dd>
        <dt className="text-stone/50">Orders · reviews</dt><dd>{orders} · {reviews}</dd>
        <dt className="text-stone/50">Owns</dt><dd>{owns === 0 ? "Nothing" : `${stays} stays, ${experiences} experiences, ${products} products, ${rewards} rewards`}</dd>
      </dl>

      {!blocked.ok ? (
        <p className="mt-8 max-w-xl rounded-sm border border-stone/15 bg-stone/5 p-4 font-body text-sm text-stone/70">{blocked.error}</p>
      ) : (
        <>
          <h2 className="mt-10 font-display text-xl text-stone">Role</h2>
          {managedElsewhere ? (
            <p className="mt-2 max-w-xl font-body text-sm text-stone/60">This is a {roleLabel(u.role).toLowerCase()} account, managed through its own approval screens, so its role can&apos;t be changed here. To give this person staff access, invite a separate staff account for them.</p>
          ) : (
            <div className="mt-3"><RoleForm userId={u.id} current={u.role} roles={assignable} /></div>
          )}

          <h2 className="mt-10 font-display text-xl text-stone">Access</h2>
          <div className="mt-3"><UserActions userId={u.id} suspended={!!u.suspendedAt} verified={!!u.emailVerifiedAt} pendingInvite={isPendingInvite(u)} /></div>
          {!u.suspendedAt && <div className="mt-6"><SuspendForm userId={u.id} /></div>}
        </>
      )}

      <h2 className="mt-12 font-display text-xl text-stone">History</h2>
      <table className="mt-3 w-full max-w-2xl text-left font-body text-sm">
        <tbody className="divide-y divide-stone/10">
          {log.map((l) => (
            <tr key={l.id}><td className="py-2 pr-4 text-stone/60">{l.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td><td className="pr-4">{AUDIT_LABELS[l.action] ?? l.action}{l.detail ? ` — ${l.detail}` : ""}</td><td className="text-xs text-stone/50">by {l.actorEmail}</td></tr>
          ))}
          {log.length === 0 && <tr><td className="py-3 text-stone/50">Nothing recorded yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
