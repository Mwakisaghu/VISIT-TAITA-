import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import AdminCrumb from "@/components/admin/AdminCrumb";
import AdminNav from "@/components/admin/AdminNav";
import { loadAdminBadges } from "@/lib/admin-badges";
import { visibleGroups } from "@/lib/admin-nav";
import { ADMIN_ROLES, authOptions } from "@/lib/auth";
import { isManager } from "@/lib/user-admin";

// Admin pages show live counts and inboxes — never serve a stale prerender.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) redirect("/login");

  const groups = visibleGroups(session.user.role);
  const badges = await loadAdminBadges(isManager(session.user.role));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-10 lg:py-12">
      <aside className="w-full shrink-0 print:hidden lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-64 lg:self-start lg:overflow-y-auto">
        <AdminNav groups={groups} badges={badges} />
      </aside>
      <div className="min-w-0 flex-1">
        <AdminCrumb groups={groups} />
        {children}
      </div>
    </div>
  );
}
