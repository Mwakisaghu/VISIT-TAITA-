"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AdminIcon from "@/components/admin/AdminIcon";
import { activeItem, badgeText, groupBadge, OVERVIEW, type Badges, type NavGroup, type NavItem } from "@/lib/admin-nav";

function Badge({ n, what }: { n: number; what: string }) {
  if (n <= 0) return null;
  return <span className="ml-auto inline-flex min-w-[1.375rem] justify-center rounded-full bg-rust px-1.5 py-0.5 font-body text-xs font-bold leading-snug text-white">{badgeText(n)}<span className="sr-only"> {what}</span></span>;
}

/**
 * The admin menu (the left column): an icon for each section, sections you can fold away, the current page marked in a neutral tone (rust is kept for "something is waiting"), small counts where something is
 * waiting (each saying what it counts), and the section holding the current page always open. Finding a page by name lives in the bar above (AdminFind); the phone's menu button lives there too, and tells this
 * menu whether to show (`mobileOpen`): it is always shown from the laptop width up.
 */
export default function AdminNav({ groups, badges, mobileOpen = false }: { groups: NavGroup[]; badges: Badges; mobileOpen?: boolean }) {
  const pathname = usePathname() ?? "/admin";
  const current = activeItem(pathname, groups);
  const [open, setOpen] = useState<Record<string, boolean>>(() => (current?.group ? { [current.group.id]: true } : {}));

  // Moving to a page in another section opens that section (and leaves the others as they were).
  useEffect(() => {
    const g = activeItem(pathname, groups)?.group;
    if (g) setOpen((o) => (o[g.id] ? o : { ...o, [g.id]: true }));
  }, [pathname, groups]);

  const where = current ? (current.group ? `${current.group.label} › ${current.item.label}` : current.item.label) : "Admin";
  const sub = (item: NavItem) => {
    const isCurrent = current?.item.href === item.href;
    return (
      <Link key={item.href} href={item.href} aria-current={isCurrent ? "page" : undefined} className={`focus-ring flex min-h-[2.5rem] items-center gap-2 rounded-lg px-2.5 font-body text-[0.84375rem] ${isCurrent ? "bg-admin-sel font-bold text-stone" : "text-stone hover:bg-admin-sel/60"}`}>
        <span className="min-w-0">{item.label}</span>
        {item.badge && <Badge n={badges[item.badge] ?? 0} what="waiting" />}
      </Link>
    );
  };
  const overviewCurrent = current?.item.href === OVERVIEW.href;

  return (
    <div id="admin-menu" className={`${mobileOpen ? "block" : "hidden"} lg:block`}>
      <nav aria-label="Admin" className="flex flex-col gap-0.5 p-3">
        <Link href={OVERVIEW.href} aria-current={overviewCurrent ? "page" : undefined} className={`focus-ring flex min-h-[2.625rem] items-center gap-2.5 rounded-lg px-2.5 font-body text-sm ${overviewCurrent ? "bg-admin-sel font-bold text-stone" : "font-medium text-stone hover:bg-admin-sel/60"}`}>
          <AdminIcon name="home" className={overviewCurrent ? "text-stone" : "text-admin-muted"} />
          {OVERVIEW.label}
        </Link>
        {groups.map((g) => {
          const isOpen = !!open[g.id];
          const waiting = groupBadge(g, badges);
          const hasCurrent = current?.group?.id === g.id;
          return (
            <div key={g.id}>
              <button
                type="button" aria-expanded={isOpen} aria-controls={`admin-group-${g.id}`}
                onClick={() => setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))}
                className={`focus-ring flex min-h-[2.625rem] w-full items-center gap-2.5 rounded-lg px-2.5 text-left font-body text-sm text-stone hover:bg-admin-sel/60 ${hasCurrent ? "font-bold" : "font-medium"}`}
              >
                <AdminIcon name={g.icon} className={hasCurrent ? "text-stone" : "text-admin-muted"} />
                <span className="min-w-0 flex-1">{g.label}</span>
                {!isOpen && <Badge n={waiting} what="waiting in this section" />}
                <AdminIcon name="chevd" size={16} className={`text-admin-faint transition-transform motion-reduce:transition-none ${isOpen ? "" : "-rotate-90"}`} />
              </button>
              {isOpen && <div id={`admin-group-${g.id}`} className="mb-1.5 ml-[2.375rem] mt-0.5 flex flex-col gap-0.5">{g.items.map((i) => sub(i))}</div>}
            </div>
          );
        })}
      </nav>
      <p className="sr-only" aria-live="polite">{where}</p>
    </div>
  );
}
