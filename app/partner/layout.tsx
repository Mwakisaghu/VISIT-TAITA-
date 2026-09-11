import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";

const SELLER_ROLES = ["SELLER", ...ADMIN_ROLES];

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

  if (!SELLER_ROLES.includes(session.user.role)) {
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-display text-2xl text-stone">This dashboard is for approved partners.</p>
        <p className="mt-3 font-body text-stone/60">
          Apply to become a Taita Made seller and we&apos;ll grant access once approved.
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

  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-6 py-12">
      <aside className="w-48 shrink-0">
        <p className="font-display text-xl text-stone">Partner</p>
        <nav className="mt-6 flex flex-col gap-1 font-body text-sm">
          <Link
            href="/partner/products"
            className="focus-ring rounded-sm px-2 py-2 text-stone/70 hover:bg-stone/5 hover:text-stone"
          >
            My products
          </Link>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
