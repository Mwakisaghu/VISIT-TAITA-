import Link from "next/link";

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/destinations", label: "Destinations" },
  { href: "/admin/stories", label: "Stories" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/cup/teams", label: "Cup: Teams" },
  { href: "/admin/cup/players", label: "Cup: Players" },
  { href: "/admin/cup/fixtures", label: "Cup: Fixtures" },
  { href: "/admin/cup/venues", label: "Cup: Venues" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-6 py-12">
      <aside className="w-48 shrink-0">
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
