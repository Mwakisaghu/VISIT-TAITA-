import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ADMIN_ROLES, authOptions } from "@/lib/auth";

// Admin pages show live counts and inboxes — never serve a stale prerender.
export const dynamic = "force-dynamic";

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/destinations", label: "Destinations" },
  { href: "/admin/stories", label: "Stories" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/cup/teams", label: "Cup: Teams" },
  { href: "/admin/cup/players", label: "Cup: Players" },
  { href: "/admin/cup/fixtures", label: "Cup: Fixtures" },
  { href: "/admin/cup/venues", label: "Cup: Venues" },
  { href: "/admin/week/sessions", label: "Week: Programme" },
  { href: "/admin/week/venues", label: "Week: Venues" },
  { href: "/admin/accommodations", label: "Accommodations" },
  { href: "/admin/accommodations/enquiries", label: "Stay Enquiries" },
  { href: "/admin/experiences", label: "Experiences" },
  { href: "/admin/experiences/enquiries", label: "Experience Enquiries" },
  { href: "/admin/shop/products", label: "Shop: Products" },
  { href: "/admin/shop/orders", label: "Shop: Orders" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/creators", label: "Creators" },
  { href: "/admin/rewards", label: "Rewards" },
  { href: "/admin/rewards/redemptions", label: "Vouchers" },
  { href: "/admin/sponsors", label: "Sponsors" },
  { href: "/admin/sponsors/packages", label: "Sponsor Packages" },
  { href: "/admin/sponsors/leads", label: "Sponsor Leads" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) redirect("/login");

  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-6 py-12">
      <aside className="w-48 shrink-0 print:hidden">
        <p className="font-display text-xl text-stone">Admin</p>
        <nav className="mt-6 flex flex-col gap-1 font-body text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring rounded-sm px-2 py-2 text-stone/70 hover:bg-stone/5 hover:text-stone"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
