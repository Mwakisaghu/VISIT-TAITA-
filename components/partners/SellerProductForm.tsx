import type { Product } from "@prisma/client";
import { saveSellerProduct } from "@/lib/actions/seller";

const categories = [
  "CLOTHING",
  "ART",
  "CRAFTS",
  "FOOD",
  "HOME",
  "BOOKS",
  "PHOTOGRAPHY",
  "COLLECTIBLES",
];

export default function SellerProductForm({ product }: { product?: Product }) {
  const action = saveSellerProduct.bind(null, product?.id ?? null);

  return (
    <form action={action} className="mt-8 flex max-w-xl flex-col gap-5">
      <Field label="Name">
        <input name="name" defaultValue={product?.name} required className="input" />
      </Field>

      <Field label="Category">
        <select name="category" defaultValue={product?.category ?? "CRAFTS"} className="input">
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          defaultValue={product?.description}
          required
          rows={4}
          className="input"
        />
      </Field>

      <Field label="Price (KES)">
        <input
          name="price"
          type="number"
          min={1}
          step={1}
          defaultValue={product?.price}
          required
          className="input"
        />
      </Field>

      <Field label="Image URL">
        <input name="image" type="url" defaultValue={product?.image} required className="input" />
      </Field>

      <Field label="SKU">
        <input name="sku" defaultValue={product?.sku} required className="input" />
      </Field>

      <Field label="Inventory">
        <input
          name="inventory"
          type="number"
          min={0}
          step={1}
          defaultValue={product?.inventory ?? 0}
          required
          className="input"
        />
      </Field>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 font-body text-sm text-stone/70">
          <input type="checkbox" name="offersShipping" defaultChecked={product?.offersShipping ?? true} />
          Offers shipping
        </label>
        <label className="flex items-center gap-2 font-body text-sm text-stone/70">
          <input type="checkbox" name="offersPickup" defaultChecked={product?.offersPickup ?? true} />
          Offers local pickup
        </label>
      </div>

      <label className="flex items-center gap-2 font-body text-sm text-stone/70">
        <input type="checkbox" name="featured" defaultChecked={product?.featured} />
        Featured (Visit Taita team picks featured listings)
      </label>

      {!product && (
        <p className="font-body text-xs text-stone/50">
          New listings are saved as drafts and reviewed by the Visit Taita
          team before they go live in the shop.
        </p>
      )}

      <button
        type="submit"
        className="focus-ring mt-2 w-fit rounded-full bg-rust px-6 py-3 font-body text-sm text-parchment hover:bg-rust-deep"
      >
        {product ? "Save changes" : "Submit listing"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-body text-sm text-stone/70">{label}</span>
      {children}
    </label>
  );
}
