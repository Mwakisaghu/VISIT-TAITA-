import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteProduct, publishProduct } from "@/lib/actions/marketplace";
import { formatPrice } from "@/lib/format";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: { seller: { select: { name: true, role: true } } },
  });

  const pendingReview = products.filter(
    (p) => p.status === "DRAFT" && p.seller?.role === "SELLER"
  );
  const rest = products.filter((p) => !pendingReview.includes(p));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-stone">Taita Made — Products</h1>
        <Link
          href="/admin/shop/products/new"
          className="focus-ring rounded-full bg-rust px-5 py-2 font-body text-sm text-parchment hover:bg-rust-deep"
        >
          New product
        </Link>
      </div>

      {pendingReview.length > 0 && (
        <div className="mt-8 rounded-sm border border-ochre/40 bg-ochre/10 p-5">
          <p className="font-display text-lg text-stone">
            Pending partner review ({pendingReview.length})
          </p>
          <div className="mt-4 divide-y divide-stone/10">
            {pendingReview.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-body text-xs text-stone/50">
                    From {p.seller?.name} · {p.category} · {formatPrice(p.price)}
                  </p>
                  <p className="font-display text-lg text-stone">{p.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/shop/products/${p.id}`}
                    className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
                  >
                    Review
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      await publishProduct(p.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="focus-ring rounded-full bg-canopy px-4 py-2 font-body text-xs text-parchment hover:bg-canopy-deep"
                    >
                      Publish
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 divide-y divide-stone/10">
        {rest.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-body text-xs text-stone/50">
                {p.category} · {p.status} · {formatPrice(p.price)} · {p.inventory} in stock
                {p.isDemo && " · demo"}
              </p>
              <p className="font-display text-lg text-stone">{p.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/shop/products/${p.id}`}
                className="focus-ring font-body text-sm text-stone/70 hover:text-rust"
              >
                Edit
              </Link>
              <form
                action={async () => {
                  "use server";
                  await deleteProduct(p.id);
                }}
              >
                <button type="submit" className="focus-ring font-body text-sm text-stone/40 hover:text-rust">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {products.length === 0 && <p className="py-8 font-body text-stone/50">No products yet.</p>}
      </div>
    </div>
  );
}
