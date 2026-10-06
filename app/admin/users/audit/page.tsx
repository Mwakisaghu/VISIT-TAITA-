import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireManagerPage } from "@/lib/user-admin-server";
import { AUDIT_LABELS } from "@/lib/user-admin";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireManagerPage();
  const log = await prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, createdAt: true, action: true, actorEmail: true, targetUserId: true, targetEmail: true, detail: true } });
  return (
    <div>
      <Link href="/admin/users" className="font-body text-sm text-stone/60 hover:text-rust">← All users</Link>
      <h1 className="mt-3 font-display text-3xl text-stone">Activity log</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-stone/60">Who changed which account, and when. The latest 200 actions. When someone deletes their own account, their email is removed from these records.</p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left font-body text-sm">
          <thead className="text-xs text-stone/50"><tr><th className="py-2 pr-4">When</th><th className="pr-4">Who</th><th className="pr-4">Did</th><th>To</th></tr></thead>
          <tbody className="divide-y divide-stone/10">
            {log.map((l) => (
              <tr key={l.id}>
                <td className="py-2 pr-4 text-stone/60">{l.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className="pr-4">{l.actorEmail}</td>
                <td className="pr-4">{AUDIT_LABELS[l.action] ?? l.action}{l.detail ? <span className="block text-xs text-stone/50">{l.detail}</span> : null}</td>
                <td>{l.targetUserId ? <Link href={`/admin/users/${l.targetUserId}`} className="text-rust underline">{l.targetEmail ?? "(deleted account)"}</Link> : "—"}</td>
              </tr>
            ))}
            {log.length === 0 && <tr><td colSpan={4} className="py-6 text-stone/50">Nothing recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
