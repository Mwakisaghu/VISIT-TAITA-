import { splitLocale } from "@/lib/i18n/config";

/** Is this address inside the admin area? (Also when the public site's language prefix is in front of it.) */
export function isAdminPath(pathname: string | null | undefined): boolean {
  const rest = splitLocale(pathname ?? "/").rest;
  return rest === "/admin" || rest.startsWith("/admin/");
}
