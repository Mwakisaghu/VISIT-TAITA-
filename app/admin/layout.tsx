import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import AdminShell from "@/components/admin/AdminShell";
import { loadAdminBadges } from "@/lib/admin-badges";
import { attentionTotal, visibleGroups } from "@/lib/admin-nav";
import { ADMIN_ROLES, authOptions } from "@/lib/auth";
import { isManager } from "@/lib/user-admin";

// Admin pages show live counts and inboxes — never serve a stale prerender.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) redirect("/login");

  const groups = visibleGroups(session.user.role);
  const badges = await loadAdminBadges(isManager(session.user.role));

  return <AdminShell groups={groups} badges={badges} waiting={attentionTotal(badges, isManager(session.user.role))}>{children}</AdminShell>;
}
