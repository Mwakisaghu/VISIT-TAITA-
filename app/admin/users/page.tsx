import Link from "next/link";
import DemoAdminWarning from "@/components/admin/DemoAdminWarning";
import UserRowActions from "@/components/admin/UserRowActions";
import { prisma } from "@/lib/prisma";
import { requireManagerPage } from "@/lib/user-admin-server";
import { accountStatus, buildUserWhere, checkActOn, pageNumbers, parseUserListQuery, roleLabel, STAFF_ROLES, USER_PAGE_SIZE } from "@/lib/user-admin";

export const dynamic = "force-dynamic";

const ROLE_ORDER = ["SUPER_ADMIN", "ADMIN", "EDITOR", "CONTENT_MANAGER", "PARTNER", "SELLER", "CREATOR", "MEMBER", "VISITOR"];
const PILL: Record<string, string> = { Active: "bg-canopy/10 text-canopy", Suspended: "bg-rust/10 text-rust", "Invite pending": "bg-ochre/15 text-ochre", "Email not verified": "bg-stone/10 text-stone/70" };

export default async function UsersPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const actor = await requireManagerPage();
  const q = parseUserListQuery(searchParams);
  const where = buildUserWhere(q);
  const count = (query: Partial<typeof q>) => prisma.user.count({ where: buildUserWhere({ q: "", role: "", status: "", page: 1, ...query }) as never });
  const [users, total, everyone, suspended, pending, unverified, staff] = await Promise.all([
    prisma.user.findMany({
      where: where as never, orderBy: [{ createdAt: "desc" }], skip: (q.page - 1) * USER_PAGE_SIZE, take: USER_PAGE_SIZE,
      select: { id: true, name: true, email: true, role: true, createdAt: true, suspendedAt: true, emailVerifiedAt: true, passwordChangedAt: true, invitedAt: true },
    }),
    prisma.user.count({ where: where as never }),
    count({}), count({ status: "suspended" }), count({ status: "pending" }), count({ status: "unverified" }),
    prisma.user.count({ where: { role: { in: [...STAFF_ROLES] } } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / USER_PAGE_SIZE));
  const href = (page: number, over: Partial<typeof q> = {}) => { const m = { ...q, ...over }; const p = new URLSearchParams(); if (m.q) p.set("q", m.q); if (m.role) p.set("role", m.role); if (m.status) p.set("status", m.status); if (page > 1) p.set("page", String(page)); const s = p.toString(); return `/admin/users${s ? `?${s}` : ""}`; };
  const from = total === 0 ? 0 : (q.page - 1) * USER_PAGE_SIZE + 1;
  const to = Math.min(total, q.page * USER_PAGE_SIZE);

  const tiles = [
    { label: "All accounts", value: everyone, status: "", note: `${staff} staff` },
    { label: "Suspended", value: suspended, status: "suspended", note: "can't sign in", tone: suspended > 0 ? "text-rust" : "" },
    { label: "Invite pending", value: pending, status: "pending", note: "staff not yet joined" },
    { label: "Email not verified", value: unverified, status: "unverified", note: "signed up, not confirmed" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-stone">Accounts</h1>
        <div className="flex gap-3">
          <Link href="/admin/users/audit" className="focus-ring rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust">Activity log</Link>
          <Link href="/admin/users/new" className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep">Invite staff</Link>
        </div>
      </div>
      <p className="mt-2 max-w-2xl font-body text-sm text-stone/60">Everyone who has an account. Open an account to change its role or send it a link; suspend someone here or on their page.</p>

      <DemoAdminWarning />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const on = q.status === t.status && !q.q && !q.role;
          return (
            <Link key={t.label} href={href(1, { status: t.status, q: "", role: "" })} aria-current={on ? "true" : undefined} className={`focus-ring rounded-sm border p-4 ${on ? "border-rust bg-rust/5" : "border-stone/10 hover:border-stone/30"}`}>
              <p className={`font-display text-3xl ${t.tone ?? "text-stone"}`}>{t.value}</p>
              <p className="mt-1 font-body text-sm text-stone">{t.label}</p>
              <p className="font-body text-xs text-stone/50">{t.note}</p>
            </Link>
          );
        })}
      </div>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 font-body text-xs text-stone/60">Name or email<input name="q" defaultValue={q.q} maxLength={80} className="input" /></label>
        <label className="flex flex-col gap-1 font-body text-xs text-stone/60">Role
          <select name="role" defaultValue={q.role} className="input"><option value="">All roles</option>{ROLE_ORDER.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1 font-body text-xs text-stone/60">Status
          <select name="status" defaultValue={q.status} className="input"><option value="">Any</option><option value="suspended">Suspended</option><option value="pending">Invite pending</option><option value="unverified">Email not verified</option></select>
        </label>
        <button type="submit" className="focus-ring rounded-full border border-stone/20 px-5 py-2 font-body text-sm text-stone hover:border-rust hover:text-rust">Filter</button>
        {(q.q || q.role || q.status) && <Link href="/admin/users" className="font-body text-sm text-stone/60 underline">Show everyone</Link>}
      </form>

      <p className="mt-6 font-body text-xs text-stone/50" aria-live="polite">{total === 0 ? "No accounts match." : `Showing ${from}–${to} of ${total} account${total === 1 ? "" : "s"}`}</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left font-body text-sm">
          <caption className="sr-only">Accounts, newest first</caption>
          <thead className="text-xs text-stone/50"><tr><th scope="col" className="py-2 pr-4">Person</th><th scope="col" className="pr-4">Role</th><th scope="col" className="pr-4">Status</th><th scope="col" className="pr-4">Joined</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="divide-y divide-stone/10">
            {users.map((u) => {
              const status = accountStatus(u);
              const canAct = checkActOn(actor, { id: u.id, role: u.role }).ok;
              return (
                <tr key={u.id} className={u.suspendedAt ? "bg-rust/[0.03]" : ""}>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone/10 font-body text-sm text-stone/70">{(u.name || u.email).trim().charAt(0).toUpperCase()}</span>
                      <span className="min-w-0"><Link href={`/admin/users/${u.id}`} className="block truncate text-stone hover:text-rust">{u.name}</Link><span className="block truncate text-xs text-stone/50">{u.email}</span></span>
                    </div>
                  </td>
                  <td className="pr-4">{roleLabel(u.role)}</td>
                  <td className="pr-4"><span className={`rounded-full px-2.5 py-0.5 text-xs ${PILL[status]}`}>{status}</span></td>
                  <td className="pr-4 text-stone/60">{u.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="py-3 text-right">
                    <div className="flex items-start justify-end gap-3">
                      {canAct && <UserRowActions userId={u.id} name={u.name} suspended={!!u.suspendedAt} />}
                      <Link href={`/admin/users/${u.id}`} className="focus-ring rounded-full px-1 py-1 text-xs text-rust underline">Manage</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && <tr><td colSpan={5} className="py-8 text-stone/50">No accounts match. <Link href="/admin/users" className="text-rust underline">Show everyone</Link></td></tr>}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex flex-wrap items-center gap-2 font-body text-sm">
          {q.page > 1 && <Link href={href(q.page - 1)} rel="prev" className="rounded-full border border-stone/20 px-4 py-1.5 text-stone hover:border-rust">← Newer</Link>}
          {pageNumbers(q.page, pages).map((p, i) => p === null ? <span key={`gap${i}`} className="px-1 text-stone/40">…</span> : <Link key={p} href={href(p)} aria-current={p === q.page ? "page" : undefined} className={`min-w-9 rounded-full px-3 py-1.5 text-center ${p === q.page ? "bg-stone text-parchment" : "text-stone hover:bg-stone/5"}`}>{p}</Link>)}
          {q.page < pages && <Link href={href(q.page + 1)} rel="next" className="rounded-full border border-stone/20 px-4 py-1.5 text-stone hover:border-rust">Older →</Link>}
        </nav>
      )}
    </div>
  );
}
