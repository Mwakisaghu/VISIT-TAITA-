// The cart as plain functions (no React), so the rules can be tested and the provider stays thin.
// A line is identified by (product, option): the same shirt in M and in L are two lines; two Ms merge into one.
import { OPTION_LIMITS, lineKey } from "@/lib/product-options";

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  option?: string | null;
  optionLabel?: string;
};

export const MAX_LINE_QUANTITY = 10;

const str = (v: unknown, max: number) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);

/**
 * Whatever came out of localStorage -> a valid cart. Anything malformed (hand-edited, from an older version, corrupted) is
 * dropped instead of crashing the shop, and duplicate lines are merged.
 */
export function sanitizeCart(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  let lines: CartLine[] = [];
  for (const r of raw.slice(0, 100)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const productId = str(o.productId, 100), slug = str(o.slug, 200), name = str(o.name, 200), image = str(o.image, 500);
    const price = o.price, quantity = o.quantity;
    if (!productId || !slug || !name || !image) continue;
    if (typeof price !== "number" || !Number.isInteger(price) || price < 0) continue;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) continue;
    const option = typeof o.option === "string" && o.option.length > 0 && o.option.length <= OPTION_LIMITS.maxLength ? o.option : null;
    const optionLabel = typeof o.optionLabel === "string" && o.optionLabel.length <= OPTION_LIMITS.maxLength ? o.optionLabel : undefined;
    lines = addLine(lines, { productId, slug, name, price, image, option, optionLabel }, quantity);
  }
  return lines;
}

export function addLine(lines: CartLine[], item: Omit<CartLine, "quantity">, quantity = 1): CartLine[] {
  const key = lineKey(item);
  const found = lines.find((l) => lineKey(l) === key);
  if (found) return lines.map((l) => (l === found ? { ...l, quantity: Math.min(MAX_LINE_QUANTITY, l.quantity + quantity) } : l));
  return [...lines, { ...item, quantity: Math.min(MAX_LINE_QUANTITY, Math.max(1, quantity)) }];
}

export function removeLine(lines: CartLine[], key: string): CartLine[] {
  return lines.filter((l) => lineKey(l) !== key);
}

export function setLineQuantity(lines: CartLine[], key: string, quantity: number): CartLine[] {
  if (quantity <= 0) return removeLine(lines, key);
  return lines.map((l) => (lineKey(l) === key ? { ...l, quantity: Math.min(MAX_LINE_QUANTITY, quantity) } : l));
}

export function cartTotals(lines: CartLine[]) {
  return { count: lines.reduce((n, l) => n + l.quantity, 0), subtotal: lines.reduce((n, l) => n + l.quantity * l.price, 0) };
}
