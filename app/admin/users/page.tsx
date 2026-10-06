import Link from "next/link";
import DemoAdminWarning from "@/components/admin/DemoAdminWarning";
import { prisma } from "@/lib/prisma";
import { requireManagerPage } from "@/lib/user-admin-server";
import { accountStatus, buildUserWhere, parseUserListQuery, roleLabel, USER_PAGE_SIZE } from "@/lib/user-admin";

export const dynamic = "force-dynamic";

const ROLE_ORDER = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER", "PARTNER", "SELLER", "CREATOR", "MEMBER", "VISITOR"];

export default async function UsersPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requireManagerPage();
  const q = parseUserListQuery(searchParams);
  const where = buildUserWhere(q);
  const [users, total, byRole] = await Promise.all([
    prisma.user.findMany({ where: where as never, orderBy: [{ createdAt: "desc" }], skip: (q.page - 1) * USER_PAGE_SIZE, take: USER_PAGE_SIZE, select: { id: true, name: true, email: true, role: true, createdAt: true, emailVerifiedAt: true, passwordChangedAt: true, invitedAt: true, suspendedAt: true } }),
    prisma.user.count({ where: where as never }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / USER_PAGE_SIZE));
  const href = (page: number) => { const p = new URLSearchParams(); if (q.q) p.set("q", q.q); if (q.role) p.set("role", q.role); if (q.status) p.set("status", q.status); if (page > 1) p.set("page", String(page)); const s = p.toString(); return `/admin/users${s ? `?${s}` : ""}`; };
  const counts = new Map(byRole.map((r) => [r.role as string, r._count._all]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-stone">Users</h1>
        <div className="flex gap-3">
          <Link href="/admin/users/audit" className="focus-ring rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust">Activity log</Link>
          <Link href="/admin/users/new" className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep">Invite staff</Link>
        </div>
      </div>

      <DemoAdminWarning />

      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-stone/60">
        {ROLE_ORDER.filter((r) => counts.get(r)).map((r) => <Link key={r} href={`/admin/users?role=${r}`} className="hover:text-rust">{roleLabel(r)}: {counts.get(r)}</Link>)}
      </p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 font-body text-xs text-stone/60">Name or email<input name="q" defaultValue={q.q} maxLength={80} className="input" /></label>
        <label className="flex flex-col gap-1 font-body text-xs text-stone/60">Role
          <select name="role" defaultValue={q.role} className="input"><option value="">All roles</option>{ROLE_ORDER.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1 font-body text-xs text-stone/60">Status
          <select name="status" defaultValue={q.status} className="input"><option value="">Any</option><option value="suspended">Suspended</option><option value="pending">Invite pending</option><option value="unverified">Email not verified</option></select>
        </label>
        <button type="submit" className="focus-ring rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust">Filter</button>
        {(q.q || q.role || q.status) && <Link href="/admin/users" className="font-body text-sm text-stone/60 underline">Clear</Link>}
      </form>

      <p className="mt-6 font-body text-xs text-stone/50">{total} account{total === 1 ? "" : "s"}{total > USER_PAGE_SIZE ? ` · page ${q.page} of ${pages}` : ""}</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left font-body text-sm">
          <thead className="text-xs text-stone/50"><tr><th className="py-2 pr-4">Person</th><th className="pr-4">Role</th><th className="pr-4">Status</th><th className="pr-4">Joined</th><th /></tr></thead>
          <tbody className="divide-y divide-stone/10">
            {users.map((u) => {
              const status = accountStatus(u);
              return (
                <tr key={u.id} className={u.suspendedAt ? "opacity-60" : ""}>
                  <td className="py-3 pr-4"><p className="text-stone">{u.name}</p><p className="text-xs text-stone/50">{u.email}</p></td>
                  <td className="pr-4">{roleLabel(u.role)}</td>
                  <td className="pr-4">{status === "Active" ? <span className="text-stone/50">Active</span> : <span className={status === "Suspended" ? "text-rust" : "text-ochre"}>{status}</span>}</td>
                  <td className="pr-4 text-stone/60">{u.createdAt.toISOString().slice(0, 10)}</td>
                  <td><Link href={`/admin/users/${u.id}`} className="text-rust underline">Manage</Link></td>
                </tr>
              );
            })}
            {users.length === 0 && <tr><td colSpan={5} className="py-6 text-stone/50">No accounts match.</td></tr>}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex gap-4 font-body text-sm">
          {q.page > 1 && <Link href={href(q.page - 1)} className="text-rust underline">← Newer</Link>}
          {q.page < pages && <Link href={href(q.page + 1)} className="text-rust underline">Older →</Link>}
        </nav>
      )}
    </div>
  );
}
