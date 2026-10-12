import type { Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const hint = "font-body text-sm text-stone/70";

/** The "Made by and how" part of a product form. Every field is optional. */
export default async function ProvenanceFields({ product }: { product?: Pick<Product, "makerId" | "madeInHours" | "material" | "howMade"> | null }) {
  const makers = await prisma.maker.findMany({ select: { id: true, name: true, consentGivenAt: true }, orderBy: { name: "asc" } });
  return (
    <fieldset className="flex flex-col gap-5 rounded-sm border border-stone/20 p-5">
      <legend className="px-2 font-body text-sm font-semibold text-stone">Made by, and how (optional)</legend>
      <label className="flex flex-col gap-1">
        <span className={hint}>Maker</span>
        <select name="makerId" defaultValue={product?.makerId ?? ""} className="input">
          <option value="">No maker named</option>
          {makers.map((m) => <option key={m.id} value={m.id}>{m.name}{m.consentGivenAt ? "" : " (no consent yet: hidden)"}</option>)}
        </select>
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1"><span className={hint}>About how many hours one piece takes</span><input name="madeInHours" type="number" min={1} max={2000} step={1} defaultValue={product?.madeInHours ?? ""} className="input" /></label>
        <label className="flex flex-col gap-1"><span className={hint}>Material</span><input name="material" maxLength={120} defaultValue={product?.material ?? ""} placeholder="e.g. Hand-twisted sisal, plant-dyed" className="input" /></label>
      </div>
      <label className="flex flex-col gap-1"><span className={hint}>How it was made</span><textarea name="howMade" rows={6} maxLength={2000} defaultValue={product?.howMade ?? ""} className="input" /><span className={hint}>One short paragraph per step, with a blank line between (for example: the material, the making, the finishing). Up to 8 steps.</span></label>
    </fieldset>
  );
}
