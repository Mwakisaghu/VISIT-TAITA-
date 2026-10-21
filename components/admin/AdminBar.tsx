"use client";

import Link from "next/link";
import AdminFind from "@/components/admin/AdminFind";
import AdminIcon from "@/components/admin/AdminIcon";
import Logo from "@/components/brand/Logo";
import { badgeText, type NavGroup } from "@/lib/admin-nav";

const iconButton = "focus-ring relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-parchment hover:bg-white/10";

/**
 * The admin's own top bar (the public site's header is not shown here): the mark and "Admin", Find a page, a link out to the site, the bell with how many things are waiting, and your account. On a phone the menu button
 * sits at the left and the search drops to its own row.
 */
export default function AdminBar({ groups, waiting, menuOpen, onMenu, here }: { groups: NavGroup[]; waiting: number; menuOpen: boolean; onMenu: () => void; here: string }) {
  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center gap-x-4 gap-y-2 bg-stone px-2 py-2 text-parchment sm:px-5 print:hidden">
      <button type="button" onClick={onMenu} aria-expanded={menuOpen} aria-controls="admin-menu" aria-label={menuOpen ? "Close menu" : `Open menu, you are in ${here}`} className={`${iconButton} lg:hidden`}>
        <AdminIcon name="menu" size={22} />
      </button>
      <Link href="/admin" aria-label="Visit Taita admin, overview" className="focus-ring flex items-center gap-3 rounded">
        <Logo variant="full" decorative className="h-8 w-auto text-parchment" />
        <span className="rounded bg-[#3A342C] px-2 py-0.5 font-body text-[0.78rem] font-bold tracking-[0.04em]">Admin</span>
      </Link>
      <div className="order-last w-full px-1 sm:order-none sm:mx-auto sm:max-w-[32.5rem] sm:flex-1 sm:px-0"><AdminFind groups={groups} /></div>
      <div className="ml-auto flex items-center gap-1">
        <a href="/" target="_blank" rel="noopener noreferrer" className="focus-ring hidden min-h-[2.75rem] items-center gap-1.5 rounded px-2.5 font-body text-sm font-semibold text-parchment hover:bg-white/10 sm:inline-flex">
          View site<AdminIcon name="ext" size={16} /><span className="sr-only"> (opens in a new tab)</span>
        </a>
        <Link href="/admin#attention" aria-label={waiting > 0 ? `${waiting} waiting for you` : "Nothing waiting for you"} className={iconButton}>
          <AdminIcon name="bell" size={20} />
          {waiting > 0 && <span className="absolute right-1 top-1 min-w-[1.125rem] rounded-full bg-rust px-1.5 py-px text-center font-body text-[0.72rem] font-bold leading-snug text-white">{badgeText(waiting)}</span>}
        </Link>
        <Link href="/account" aria-label="Your account" className={`${iconButton} border border-[#4A443B] bg-[#2B2621]`}><AdminIcon name="user" size={20} /></Link>
      </div>
    </header>
  );
}
