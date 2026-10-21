"use client";
import { usePathname } from "next/navigation";
import { isAdminPath } from "@/lib/admin-path";

/** The public site's header, footer and helpers are not for the admin area, which has its own bar: this draws nothing there and its children everywhere else. */
export default function HideOnAdmin({ children }: { children: React.ReactNode }) {
  return isAdminPath(usePathname()) ? null : <>{children}</>;
}
