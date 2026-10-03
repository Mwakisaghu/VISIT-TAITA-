import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";

const PARTNER_DASHBOARD_ROLES = ["SELLER", "PARTNER", ...ADMIN_ROLES];

const linkClass =
  "focus-ring rounded-sm px-2 py-2 text-stone/70 hover:bg-stone/5 hover:text-stone";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-display text-2xl text-stone">Sign in to access the partner dashboard.</p>
        <Link
          href="/login"
          className="focus-ring mt-6 inline-block rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!PARTNER_DASHBOARD_ROLES.includes(session.user.role)) {
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-display text-2xl text-stone">This dashboard is for approved partners.</p>
        <p className="mt-3 font-body text-stone/60">
          Apply as a marketplace seller, accommodation or experience partner
          and we&apos;ll grant access once approved.
        </p>
        <Link
          href="/partners/apply"
          className="focus-ring mt-6 inline-block rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          Apply to partner
        </Link>
      </div>
    );
  }

  const isAdmin = ADMIN_ROLES.includes(session.user.role);
  const showSellerLinks = isAdmin || session.user.role === "SELLER";
  const showListingLinks = isAdmin || session.user.role === "PARTNER";

  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-6 py-12">
      <aside className="w-48 shrink-0">
        <p className="font-display text-xl text-stone">Partner</p>
        <nav className="mt-6 flex flex-col gap-1 font-body text-sm">
          {showSellerLinks && (
            <Link href="/partner/products" className={linkClass}>
              My products
            </Link>
          )}
          {showListingLinks && (
            <>
              <Link href="/partner/accommodations" className={linkClass}>
                My accommodations
              </Link>
              <Link href="/partner/experiences" className={linkClass}>
                My experiences
              </Link>
            </>
          )}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
