import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteProduct } from "@/lib/actions/marketplace";
import { formatPrice } from "@/lib/format";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { updatedAt: "desc" } });

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

      <div className="mt-8 divide-y divide-stone/10">
        {products.map((p) => (
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
