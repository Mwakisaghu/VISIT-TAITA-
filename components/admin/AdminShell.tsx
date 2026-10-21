"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AdminBar from "@/components/admin/AdminBar";
import AdminCrumb from "@/components/admin/AdminCrumb";
import AdminNav from "@/components/admin/AdminNav";
import { activeItem, type Badges, type NavGroup } from "@/lib/admin-nav";

/** Everything around an admin page: the bar, the menu, the trail and the page itself. It holds the one piece of state they share: whether the phone's menu is open (which closes when you go to a page). */
export default function AdminShell({ groups, badges, waiting, children }: { groups: NavGroup[]; badges: Badges; waiting: number; children: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin";
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  const current = activeItem(pathname, groups);
  const here = current ? (current.group ? `${current.group.label} › ${current.item.label}` : current.item.label) : "Admin";

  return (
    <div className="min-h-screen bg-admin-ground text-stone print:bg-white">
      <AdminBar groups={groups} waiting={waiting} menuOpen={menuOpen} onMenu={() => setMenuOpen((o) => !o)} here={here} />
      <div className="flex flex-col lg:flex-row lg:items-start">
        <aside className="border-b border-admin-border bg-white print:hidden lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-[15.5rem] lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <AdminNav groups={groups} badges={badges} mobileOpen={menuOpen} />
        </aside>
        <div className="min-w-0 flex-1 px-4 py-7 sm:px-8 sm:pb-14">
          {/* A comfortable width on a big monitor: forms and tables do not stretch edge to edge. */}
          <div className="mx-auto w-full max-w-[78rem]">
            <AdminCrumb groups={groups} />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
