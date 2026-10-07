"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeItem, type NavGroup } from "@/lib/admin-nav";

/** "Stays & experiences › Bookings & refunds" above every admin page, so you always know where you are. */
export default function AdminCrumb({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname() ?? "/admin";
  const here = activeItem(pathname, groups);
  if (!here || !here.group) return null; // the overview needs no trail
  return (
    <p className="mb-4 font-body text-xs text-stone/50 print:hidden">
      <Link href="/admin" className="hover:text-rust">Admin</Link> › {here.group.label} › <Link href={here.item.href} className="hover:text-rust">{here.item.label}</Link>
    </p>
  );
}
