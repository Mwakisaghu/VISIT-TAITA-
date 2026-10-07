"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { activeItem, badgeText, groupBadge, OVERVIEW, searchNav, type Badges, type NavGroup, type NavItem } from "@/lib/admin-nav";

const link = "focus-ring flex items-center gap-2 rounded-sm px-3 py-2 font-body text-sm";

function Badge({ n, what }: { n: number; what: string }) {
  if (n <= 0) return null;
  return <span aria-label={`${n} ${what}`} className="ml-auto rounded-full bg-rust px-2 py-0.5 font-body text-xs leading-none text-parchment">{badgeText(n)}</span>;
}

/**
 * The admin menu: sections you can fold away, the current page highlighted, small counts where something is waiting, a box to jump to a
 * page by name, and a single "Menu" button on phones. The section holding the current page is always open.
 */
export default function AdminNav({ groups, badges }: { groups: NavGroup[]; badges: Badges }) {
  const pathname = usePathname() ?? "/admin";
  const router = useRouter();
  const current = activeItem(pathname, groups);
  const [open, setOpen] = useState<Record<string, boolean>>(() => (current?.group ? { [current.group.id]: true } : {}));
  const [query, setQuery] = useState("");
  const [mobile, setMobile] = useState(false);

  // Moving to a page in another section opens that section (and closes the phone menu).
  useEffect(() => {
    const g = activeItem(pathname, groups)?.group;
    if (g) setOpen((o) => (o[g.id] ? o : { ...o, [g.id]: true }));
    setMobile(false);
    setQuery("");
  }, [pathname, groups]);

  const results = searchNav(query, groups);
  const searching = query.trim().length > 0;
  const where = current ? (current.group ? `${current.group.label} › ${current.item.label}` : current.item.label) : "Admin";

  const row = (item: NavItem, sub?: string) => {
    const isCurrent = current?.item.href === item.href;
    return (
      <Link
        key={item.href} href={item.href} aria-current={isCurrent ? "page" : undefined}
        className={`${link} ${isCurrent ? "bg-rust/10 font-medium text-rust" : "text-stone/75 hover:bg-stone/5 hover:text-stone"}`}
      >
        <span className="min-w-0">
          {item.label}
          {sub && <span className="block text-xs text-stone/50">{sub}</span>}
        </span>
        {item.badge && <Badge n={badges[item.badge] ?? 0} what="waiting" />}
      </Link>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between lg:block">
        <p className="font-display text-xl text-stone">Admin</p>
        <button
          type="button" onClick={() => setMobile(!mobile)} aria-expanded={mobile} aria-controls="admin-menu"
          className="focus-ring rounded-full border border-stone/20 px-4 py-2 font-body text-sm text-stone lg:hidden"
        >
          {mobile ? "Close menu" : `Menu · ${current?.item.label ?? "Admin"}`}
        </button>
      </div>

      <div id="admin-menu" className={`${mobile ? "block" : "hidden"} lg:block`}>
        <form role="search" onSubmit={(e) => { e.preventDefault(); if (results[0]) router.push(results[0].item.href); }} className="mt-4">
          <label htmlFor="admin-find" className="sr-only">Find a page</label>
          <input
            id="admin-find" type="search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }}
            placeholder="Find a page… (e.g. users)" autoComplete="off" className="input w-full"
          />
        </form>

        <nav aria-label="Admin" className="mt-4 flex flex-col gap-1">
          {searching ? (
            results.length === 0 ? <p className="px-3 py-2 font-body text-sm text-stone/60">Nothing matches “{query.trim()}”.</p> : results.map((r) => row(r.item, r.group?.label))
          ) : (
            <>
              {row(OVERVIEW)}
              {groups.map((g) => {
                const isOpen = !!open[g.id];
                const waiting = groupBadge(g, badges);
                const hasCurrent = current?.group?.id === g.id;
                return (
                  <div key={g.id} className="mt-2">
                    <button
                      type="button" aria-expanded={isOpen} aria-controls={`admin-group-${g.id}`}
                      onClick={() => setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))}
                      className={`focus-ring flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left font-body text-xs font-semibold uppercase tracking-wide ${hasCurrent ? "text-rust" : "text-stone/55 hover:text-stone"}`}
                    >
                      <span aria-hidden className={`inline-block transition-transform ${isOpen ? "rotate-90" : ""}`}>›</span>
                      {g.label}
                      {!isOpen && <Badge n={waiting} what="waiting in this section" />}
                    </button>
                    {isOpen && <div id={`admin-group-${g.id}`} className="ml-2 flex flex-col gap-0.5 border-l border-stone/10 pl-2">{g.items.map((i) => row(i))}</div>}
                  </div>
                );
              })}
            </>
          )}
        </nav>
      </div>
      <p className="sr-only" aria-live="polite">{where}</p>
    </div>
  );
}
