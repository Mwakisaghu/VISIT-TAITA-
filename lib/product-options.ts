// Product options — normally SIZES (S, M, L…), but any choice a buyer must make (colour…). Pure rules, used by the admin and
// seller forms, the cart and the order action.

export const OPTION_LIMITS = { maxOptions: 12, maxLength: 20 } as const;
export const DEFAULT_OPTION_LABEL = "Size";
const OPTION_RE = /^[\p{L}\p{N}][\p{L}\p{N} .+()/-]*$/u;
const LABEL_RE = /^[\p{L}][\p{L} ]*$/u;

/** "S, M, L, XL" (commas or new lines) -> ["S","M","L","XL"]. Duplicates (any case) are dropped. */
export function parseOptionList(raw: unknown): { options: string[] } | { error: string } {
  const parts = String(raw ?? "").split(/[,\n]/).map((p) => p.trim()).filter(Boolean);
  const seen = new Set<string>();
  const options: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    if (p.length > OPTION_LIMITS.maxLength) return { error: `Each option can be at most ${OPTION_LIMITS.maxLength} characters ("${p.slice(0, 12)}…").` };
    if (!OPTION_RE.test(p)) return { error: `"${p}" has characters that aren't allowed in an option.` };
    seen.add(key);
    options.push(p);
  }
  if (options.length > OPTION_LIMITS.maxOptions) return { error: `Use at most ${OPTION_LIMITS.maxOptions} options.` };
  return { options };
}

export function parseOptionLabel(raw: unknown): { label: string } | { error: string } {
  const t = String(raw ?? "").trim();
  if (!t) return { label: DEFAULT_OPTION_LABEL };
  if (t.length > OPTION_LIMITS.maxLength || !LABEL_RE.test(t)) return { error: "The option label should be a short word like Size or Colour." };
  return { label: t };
}

/**
 * Checks the option a buyer chose against what the product actually offers (the server never trusts the cart's idea of it).
 * - A product with options needs one of them, exactly.
 * - A product WITHOUT options just ignores a stale option (e.g. an admin removed sizes after it was added to a cart).
 */
export function resolveOption(
  product: { name: string; options: string[]; optionLabel?: string | null },
  chosen: unknown
): { ok: true; option: string | null } | { ok: false; error: string } {
  if (product.options.length === 0) return { ok: true, option: null };
  const label = (product.optionLabel || DEFAULT_OPTION_LABEL).toLowerCase();
  if (typeof chosen !== "string" || chosen.trim() === "") return { ok: false, error: `Please choose a ${label} for "${product.name}".` };
  if (!product.options.includes(chosen)) return { ok: false, error: `That ${label} isn't available for "${product.name}" — please choose again.` };
  return { ok: true, option: chosen };
}

/** One identity per (product, option): the same shirt in M and in L are two cart lines; two Ms merge. */
export function lineKey(item: { productId: string; option?: string | null }): string {
  return `${item.productId}::${item.option ?? ""}`;
}
