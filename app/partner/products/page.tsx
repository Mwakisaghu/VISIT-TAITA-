import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteSellerProduct } from "@/lib/actions/seller";
import { formatPrice } from "@/lib/format";

export default async function PartnerProductsPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = ADMIN_ROLES.includes(session!.user.role);

  const products = await prisma.product.findMany({
    where: isAdmin ? undefined : { sellerId: session!.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-stone">My products</h1>
        <Link
          href="/partner/products/new"
          className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          New listing
        </Link>
      </div>

      <div className="mt-8 divide-y divide-stone/10">
        {products.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {p.category} · {p.status} · {formatPrice(p.price)} · {p.inventory} in stock
              </p>
              <p className="font-display text-lg text-stone">{p.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/partner/products/${p.id}`}
                className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
              >
                Edit
              </Link>
              <form
                action={async () => {
                  "use server";
                  await deleteSellerProduct(p.id);
                }}
              >
                <button type="submit" className="focus-ring font-body text-sm text-stone/40 hover:text-rust">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <p className="py-8 font-body text-stone/50">No listings yet — create your first one.</p>
        )}
      </div>
    </div>
  );
}
